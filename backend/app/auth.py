import hashlib
import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Cookie, Depends, HTTPException, Request, status
from fastapi.security import HTTPAuthorizationCredentials, HTTPBearer
from jose import JWTError, jwt
from sqlalchemy.orm import Session

from app.config import get_settings
from app.database import get_db
from app.models import Profile, Workspace, WorkspaceMember

security = HTTPBearer(auto_error=False)
settings = get_settings()

ALGORITHM = "HS256"
# Asymmetric algorithms used by Supabase signing keys — verified via JWKS.
_ASYMMETRIC_ALGS = {"ES256", "RS256", "EdDSA"}
# kid -> JWK, cached across requests (refreshed on cache miss).
_JWKS_CACHE: dict[str, dict] = {}


def create_access_token(user_id: str, email: str) -> str:
    secret = settings.supabase_jwt_secret or settings.dev_jwt_secret
    payload = {
        "sub": user_id,
        "email": email,
        "exp": datetime.now(timezone.utc) + timedelta(days=7),
        "aud": "authenticated",
    }
    return jwt.encode(payload, secret, algorithm=ALGORITHM)


def _jwks_url() -> str | None:
    base = settings.supabase_url.rstrip("/")
    return f"{base}/auth/v1/.well-known/jwks.json" if base else None


def _fetch_jwks() -> dict[str, dict]:
    url = _jwks_url()
    if not url:
        return {}
    try:
        with urllib.request.urlopen(url, timeout=10) as resp:
            data = json.loads(resp.read().decode())
        return {k["kid"]: k for k in data.get("keys", []) if k.get("kid")}
    except Exception:
        return {}


def _get_jwk(kid: str) -> dict | None:
    if kid not in _JWKS_CACHE:
        _JWKS_CACHE.update(_fetch_jwks())  # refresh on miss (key rotation)
    return _JWKS_CACHE.get(kid)


def decode_token(token: str) -> dict:
    try:
        header = jwt.get_unverified_header(token)
    except JWTError as e:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e

    alg = header.get("alg", ALGORITHM)

    # Supabase user-session tokens are signed with an asymmetric key (ES256/RS256).
    if alg in _ASYMMETRIC_ALGS:
        key = _get_jwk(header.get("kid", ""))
        if key is None:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Unknown signing key")
        try:
            return jwt.decode(token, key, algorithms=[alg], options={"verify_aud": False})
        except JWTError as e:
            raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from e

    # Symmetric HS256 — demo-login tokens and legacy Supabase JWT secret.
    secrets = [s for s in [settings.supabase_jwt_secret, settings.dev_jwt_secret] if s]
    last_error: Exception | None = None
    for secret in secrets:
        try:
            return jwt.decode(token, secret, algorithms=[ALGORITHM], options={"verify_aud": False})
        except JWTError as e:
            last_error = e
    raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token") from last_error


def get_or_create_profile(db: Session, user_id: str, email: str, full_name: str | None = None) -> Profile:
    profile = db.get(Profile, user_id)
    if profile:
        # Update name if it's currently a default email-prefix name and we have a real name
        default_name = email.split("@")[0].title()
        if (not profile.full_name or profile.full_name == default_name) and full_name:
            profile.full_name = full_name
            db.commit()
            db.refresh(profile)
        return profile
    profile = Profile(
        id=user_id,
        email=email,
        full_name=full_name or email.split("@")[0].title(),
        plan="hobby",
        analyses_used=0,
        analyses_limit=settings.analyses_limit_hobby,
    )
    db.add(profile)
    db.commit()
    db.refresh(profile)
    return profile


def _unique_slug(db: Session, base: str) -> str:
    slug = base
    if not db.query(Workspace.id).filter(Workspace.slug == slug).first():
        return slug
    # Collision — append a short uuid suffix until unique.
    import uuid as _uuid
    return f"{base}-{_uuid.uuid4().hex[:6]}"


def ensure_default_workspace(db: Session, profile: Profile) -> Workspace:
    """Guarantee the user belongs to at least one workspace.

    Supabase creates the profile row via DB trigger before the backend ever
    sees the user, so first-login workspace bootstrap can't hang off profile
    creation — it has to run whenever a user has no membership yet.
    """
    membership = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.user_id == profile.id)
        .first()
    )
    if membership:
        return membership.workspace

    name = profile.full_name or profile.email.split("@")[0].title()
    workspace = Workspace(
        name=f"{name}'s Workspace",
        slug=_unique_slug(db, slugify(name)),
        plan=profile.plan,
    )
    db.add(workspace)
    db.flush()  # assign workspace.id before linking membership
    db.add(WorkspaceMember(workspace_id=workspace.id, user_id=profile.id, role="owner"))
    db.commit()
    db.refresh(workspace)
    return workspace


def get_current_user(
    request: Request,
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    archmind_token: Annotated[str | None, Cookie()] = None,
    db: Session = Depends(get_db),
) -> Profile:
    # Try Bearer header first (backward-compatible path).
    token = creds.credentials if creds else None

    # Fall back to httpOnly cookie, enforcing CSRF on mutating methods.
    if not token and archmind_token:
        if request.method in ("POST", "PUT", "PATCH", "DELETE"):
            expected_csrf = hashlib.sha256((archmind_token + ":csrf").encode()).hexdigest()
            provided_csrf = request.headers.get("X-CSRF-Token", "")
            if provided_csrf != expected_csrf:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="CSRF token mismatch",
                )
        token = archmind_token

    if not token:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")

    payload = decode_token(token)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")

    # Extract metadata details from Supabase JWT token
    user_meta = payload.get("user_metadata", {})
    full_name = user_meta.get("full_name") or user_meta.get("name") or payload.get("name")

    profile = get_or_create_profile(db, user_id, email, full_name)
    ensure_default_workspace(db, profile)
    return profile


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "workspace"


ROLE_ORDER: dict[str, int] = {"viewer": 0, "editor": 1, "owner": 2}


def check_min_role(db: Session, user_id: str, workspace_id: str, min_role: str) -> None:
    member = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.workspace_id == workspace_id,
            WorkspaceMember.user_id == user_id,
        )
        .first()
    )
    if not member or ROLE_ORDER.get(member.role, -1) < ROLE_ORDER.get(min_role, 99):
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Insufficient permissions")


def log_audit_event(
    db: Session,
    *,
    actor_id: str | None,
    action: str,
    entity_type: str | None = None,
    entity_id: str | None = None,
    metadata: dict | None = None,
    ip_address: str | None = None,
) -> None:
    from app.models import AuditLog
    db.add(AuditLog(
        actor_id=actor_id,
        action=action,
        entity_type=entity_type,
        entity_id=entity_id,
        event_metadata=metadata,
        ip_address=ip_address,
    ))
    db.flush()
