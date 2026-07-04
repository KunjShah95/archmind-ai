import hashlib

from fastapi import APIRouter, HTTPException, Request, Response, status
from fastapi.responses import JSONResponse

from app.auth import decode_token
from app.limiter import limiter

router = APIRouter(prefix="/api/auth", tags=["session"])

COOKIE_NAME = "archmind_token"
CSRF_COOKIE_NAME = "archmind_csrf"
COOKIE_MAX_AGE = 60 * 60 * 24 * 7  # 7 days


def _csrf_token(token: str) -> str:
    """Derive a CSRF token from the session JWT using a simple HMAC-free hash."""
    return hashlib.sha256((token + ":csrf").encode()).hexdigest()


def _set_session_cookies(response: Response, token: str, is_secure: bool) -> None:
    """Set httpOnly auth cookie + JS-readable CSRF cookie."""
    response.set_cookie(
        key=COOKIE_NAME,
        value=token,
        httponly=True,
        secure=is_secure,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )
    response.set_cookie(
        key=CSRF_COOKIE_NAME,
        value=_csrf_token(token),
        httponly=False,  # JS must be able to read this
        secure=is_secure,
        samesite="lax",
        max_age=COOKIE_MAX_AGE,
        path="/",
    )


@router.post("/session", status_code=200)
@limiter.limit("20/minute")
def create_session(
    request: Request,
    body: dict,
):
    """Exchange a validated JWT for httpOnly session cookies."""
    token = body.get("token", "")
    if not token:
        raise HTTPException(status_code=status.HTTP_400_BAD_REQUEST, detail="token required")
    try:
        decode_token(token)
    except HTTPException:
        raise HTTPException(status_code=status.HTTP_401_UNAUTHORIZED, detail="Invalid token")

    is_secure = request.url.hostname not in ("localhost", "127.0.0.1")
    response = JSONResponse(content={"status": "ok"})
    _set_session_cookies(response, token, is_secure)
    return response


@router.post("/logout", status_code=200)
def logout(response: Response):
    """Clear session cookies."""
    response.delete_cookie(COOKIE_NAME, path="/")
    response.delete_cookie(CSRF_COOKIE_NAME, path="/")
    return {"status": "ok"}
