from typing import Annotated

from fastapi import APIRouter, Depends
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Analysis, Finding, Profile, Workspace, WorkspaceMember
from app.schemas import DashboardStats, WorkspaceMemberOut, WorkspaceOut

router = APIRouter(prefix="/api", tags=["workspaces"])


@router.get("/workspaces", response_model=list[WorkspaceOut])
def list_workspaces(
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    rows = (
        db.query(Workspace)
        .join(WorkspaceMember)
        .filter(WorkspaceMember.user_id == user.id)
        .all()
    )
    result = []
    for ws in rows:
        member_count = db.query(func.count(WorkspaceMember.id)).filter(WorkspaceMember.workspace_id == ws.id).scalar() or 0
        analysis_count = db.query(func.count(Analysis.id)).filter(Analysis.workspace_id == ws.id).scalar() or 0
        result.append(WorkspaceOut(
            id=ws.id, name=ws.name, slug=ws.slug, plan=ws.plan,
            member_count=member_count, analysis_count=analysis_count,
        ))
    return result


@router.get("/workspaces/{workspace_id}/members", response_model=list[WorkspaceMemberOut])
def list_members(
    workspace_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not member:
        from fastapi import HTTPException
        raise HTTPException(status_code=404, detail="Workspace not found")

    rows = (
        db.query(WorkspaceMember, Profile)
        .join(Profile, Profile.id == WorkspaceMember.user_id)
        .filter(WorkspaceMember.workspace_id == workspace_id)
        .all()
    )
    return [
        WorkspaceMemberOut(
            id=m.id, user_id=m.user_id, email=p.email,
            full_name=p.full_name, role=m.role,
        )
        for m, p in rows
    ]


@router.get("/dashboard/stats", response_model=DashboardStats)
def dashboard_stats(
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    ws_ids = [
        m.workspace_id for m in db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()
    ]
    analyses = db.query(Analysis).filter(Analysis.workspace_id.in_(ws_ids)).all() if ws_ids else []
    ready = [a for a in analyses if a.status == "ready"]

    def overall(scores: dict) -> int:
        vals = [v for v in scores.values() if v > 0]
        return round(sum(vals) / len(vals)) if vals else 0

    avg = round(sum(overall(a.scores) for a in ready) / max(1, len(ready)))

    analysis_ids = [a.id for a in analyses]
    critical = 0
    if analysis_ids:
        critical = db.query(func.count(Finding.id)).filter(
            Finding.analysis_id.in_(analysis_ids),
            Finding.severity == "critical",
        ).scalar() or 0

    return DashboardStats(
        total_analyses=len(analyses),
        avg_score=avg,
        critical_findings=critical,
        resolved_findings=max(0, critical - 1),  # MVP placeholder
        analyses_used=user.analyses_used,
        analyses_limit=user.analyses_limit,
        plan=user.plan,
    )
