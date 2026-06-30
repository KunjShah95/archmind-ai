import json
import re
import urllib.request
from datetime import datetime, timedelta, timezone
from typing import Annotated

from fastapi import Depends, HTTPException, status
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
    creds: Annotated[HTTPAuthorizationCredentials | None, Depends(security)],
    db: Annotated[Session, Depends(get_db)],
) -> Profile:
    if not creds:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Not authenticated")
    payload = decode_token(creds.credentials)
    user_id = payload.get("sub")
    email = payload.get("email")
    if not user_id or not email:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token payload")
    profile = get_or_create_profile(db, user_id, email)
    ensure_default_workspace(db, profile)
    return profile


def slugify(name: str) -> str:
    s = re.sub(r"[^a-z0-9]+", "-", name.lower()).strip("-")
    return s or "workspace"
