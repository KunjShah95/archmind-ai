"""GDPR compliance endpoints — data export and hard account deletion."""

from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException, Request, status
from fastapi.responses import JSONResponse, Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.limiter import limiter
from app.models import (
    Analysis,
    FailedAnalysis,
    Finding,
    Profile,
    ShareLink,
    WorkspaceMember,
)

router = APIRouter(prefix="/api/me", tags=["gdpr"])


@router.get("/export")
@limiter.limit("5/hour")
def export_user_data(
    request: Request,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> JSONResponse:
    """Return all personal data for the authenticated user as a downloadable JSON file."""

    profile_data = {
        "id": str(user.id),
        "email": user.email,
        "full_name": user.full_name,
        "plan": user.plan,
        "analyses_used": user.analyses_used,
        "analyses_limit": user.analyses_limit,
    }

    analyses = (
        db.query(Analysis)
        .filter(Analysis.author_id == user.id, Analysis.deleted_at.is_(None))
        .all()
    )

    analyses_data = []
    for analysis in analyses:
        findings_count = (
            db.query(Finding)
            .filter(Finding.analysis_id == analysis.id)
            .count()
        )
        analyses_data.append(
            {
                "id": str(analysis.id),
                "name": analysis.name,
                "status": analysis.status,
                "scores": analysis.scores,
                "uploaded_at": (
                    analysis.created_at.isoformat() if analysis.created_at else None
                ),
                "findings_count": findings_count,
            }
        )

    memberships = (
        db.query(WorkspaceMember)
        .filter(WorkspaceMember.user_id == user.id)
        .all()
    )
    workspaces_data = [
        {
            "workspace_id": str(m.workspace_id),
            "workspace_name": m.workspace.name if m.workspace else None,
            "role": m.role,
        }
        for m in memberships
    ]

    body = {
        "exported_at": datetime.now(timezone.utc).isoformat(),
        "profile": profile_data,
        "analyses": analyses_data,
        "workspaces": workspaces_data,
    }

    return JSONResponse(
        content=body,
        headers={
            "Content-Disposition": 'attachment; filename="archmind-data-export.json"'
        },
    )


@router.delete("")
@limiter.limit("5/hour")
def delete_account(
    request: Request,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
) -> Response:
    """Permanently delete the authenticated user's account and all associated data."""

    # Guard: block deletion if user is the sole owner of a workspace that still
    # has other members (they would be left without an owner).
    owner_memberships = (
        db.query(WorkspaceMember)
        .filter(
            WorkspaceMember.user_id == user.id,
            WorkspaceMember.role == "owner",
        )
        .all()
    )

    blocked_workspace_names: list[str] = []
    for membership in owner_memberships:
        wid = membership.workspace_id

        other_owners = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == wid,
                WorkspaceMember.user_id != user.id,
                WorkspaceMember.role == "owner",
            )
            .count()
        )
        other_members = (
            db.query(WorkspaceMember)
            .filter(
                WorkspaceMember.workspace_id == wid,
                WorkspaceMember.user_id != user.id,
            )
            .count()
        )

        if other_owners == 0 and other_members > 0:
            workspace_name = membership.workspace.name if membership.workspace else str(wid)
            blocked_workspace_names.append(workspace_name)

    if blocked_workspace_names:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail=(
                "Transfer workspace ownership before deleting account. "
                f"Workspaces: {blocked_workspace_names}"
            ),
        )

    # Collect analysis IDs owned by the user for cascaded deletes.
    analysis_ids: list[str] = [
        row[0]
        for row in db.query(Analysis.id).filter(Analysis.author_id == user.id).all()
    ]

    if analysis_ids:
        # ShareLink and FailedAnalysis reference analyses without DB-level CASCADE,
        # so they must be deleted first to satisfy FK constraints.
        db.query(ShareLink).filter(
            ShareLink.analysis_id.in_(analysis_ids)
        ).delete(synchronize_session=False)

        db.query(FailedAnalysis).filter(
            FailedAnalysis.analysis_id.in_(analysis_ids)
        ).delete(synchronize_session=False)

        # Finding has ondelete="CASCADE" at the DB level but we delete explicitly
        # per spec.
        db.query(Finding).filter(
            Finding.analysis_id.in_(analysis_ids)
        ).delete(synchronize_session=False)

    # Delete all analyses (ChatMessage rows will cascade at DB level via
    # ondelete="CASCADE" on their analysis_id FK).
    db.query(Analysis).filter(Analysis.author_id == user.id).delete(
        synchronize_session=False
    )

    # Delete workspace memberships.
    db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).delete(
        synchronize_session=False
    )

    # audit_events: no ORM model exists in this codebase — step skipped.

    # Delete the profile last (other tables reference it).
    db.delete(user)

    db.commit()

    return Response(status_code=status.HTTP_204_NO_CONTENT)
