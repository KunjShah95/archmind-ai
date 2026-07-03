import uuid
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session

from app.auth import create_access_token, get_current_user, get_or_create_profile
from app.config import get_settings
from app.database import get_db
from app.models import Profile
from app.schemas import AuthResponse, DemoLoginRequest, ProfileOut

router = APIRouter(prefix="/api/auth", tags=["auth"])
settings = get_settings()


@router.get("/me", response_model=ProfileOut)
def me(user: Annotated[Profile, Depends(get_current_user)]):
    return user


@router.post("/demo-login", response_model=AuthResponse)
def demo_login(body: DemoLoginRequest, db: Annotated[Session, Depends(get_db)]):
    # Demo login bypasses password verification entirely, so it must never be
    # reachable outside local development regardless of other settings.
    if not settings.dev_mode:
        raise HTTPException(status_code=status.HTTP_403_FORBIDDEN, detail="Demo login disabled")

    user_id = str(uuid.uuid5(uuid.NAMESPACE_DNS, body.email.lower()))
    profile = get_or_create_profile(db, user_id, body.email.lower(), body.full_name)
    token = create_access_token(profile.id, profile.email)
    return AuthResponse(access_token=token, user=ProfileOut.model_validate(profile))
