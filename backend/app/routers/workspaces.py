import secrets
from datetime import datetime, timezone
from typing import Annotated

from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy import func
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Analysis, Finding, Profile, Workspace, WorkspaceMember
from app.schemas import (
    AuditEventOut,
    DashboardStats,
    InviteMemberRequest,
    UpdateMemberRoleRequest,
    WorkspaceMemberOut,
    WorkspaceOut,
)

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


@router.get("/workspaces/{workspace_id}", response_model=WorkspaceOut)
def get_workspace(
    workspace_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Workspace not found")
    ws = db.query(Workspace).filter(Workspace.id == workspace_id).first()
    member_count = db.query(func.count(WorkspaceMember.id)).filter(WorkspaceMember.workspace_id == workspace_id).scalar() or 0
    analysis_count = db.query(func.count(Analysis.id)).filter(Analysis.workspace_id == workspace_id).scalar() or 0
    return WorkspaceOut(id=ws.id, name=ws.name, slug=ws.slug, plan=ws.plan, member_count=member_count, analysis_count=analysis_count)


@router.post("/workspaces/{workspace_id}/invites", status_code=201)
def invite_member(
    workspace_id: str,
    body: InviteMemberRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not member or member.role not in ("owner", "editor"):
        raise HTTPException(status_code=403, detail="Insufficient permissions")
    invitee = db.query(Profile).filter(Profile.email == body.email).first()
    if not invitee:
        raise HTTPException(status_code=404, detail="User not found")
    existing = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == invitee.id,
    ).first()
    if existing:
        raise HTTPException(status_code=409, detail="Already a member")
    new_member = WorkspaceMember(workspace_id=workspace_id, user_id=invitee.id, role=body.role)
    db.add(new_member)
    db.commit()
    return {"status": "invited", "email": body.email, "role": body.role}


@router.patch("/workspaces/{workspace_id}/members/{member_id}")
def update_member_role(
    workspace_id: str,
    member_id: str,
    body: UpdateMemberRoleRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    actor = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not actor or actor.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can change roles")
    target = db.query(WorkspaceMember).filter(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    target.role = body.role
    db.commit()
    return {"status": "updated", "role": body.role}


@router.delete("/workspaces/{workspace_id}/members/{member_id}", status_code=204)
def remove_member(
    workspace_id: str,
    member_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    actor = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not actor or actor.role != "owner":
        raise HTTPException(status_code=403, detail="Only owners can remove members")
    target = db.query(WorkspaceMember).filter(
        WorkspaceMember.id == member_id,
        WorkspaceMember.workspace_id == workspace_id,
    ).first()
    if not target:
        raise HTTPException(status_code=404, detail="Member not found")
    db.delete(target)
    db.commit()


@router.get("/workspaces/{workspace_id}/activity", response_model=list[AuditEventOut])
def workspace_activity(
    workspace_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    member = db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first()
    if not member:
        raise HTTPException(status_code=404, detail="Workspace not found")
    analyses = db.query(Analysis).filter(Analysis.workspace_id == workspace_id).order_by(Analysis.created_at.desc()).limit(50).all()
    events: list[AuditEventOut] = []
    for a in analyses:
        author = db.query(Profile).filter(Profile.id == a.author_id).first()
        events.append(AuditEventOut(
            id=f"create-{a.id}",
            actor=author.full_name or author.email if author else "Unknown",
            actor_email=author.email if author else "",
            action="analysis.created",
            entity_type="analysis",
            entity_id=a.id,
            metadata={"name": a.name, "status": a.status},
            created_at=a.created_at,
        ))
        if a.status == "ready":
            events.append(AuditEventOut(
                id=f"ready-{a.id}",
                actor="ArchMind AI",
                actor_email="ai@archmind.io",
                action="analysis.completed",
                entity_type="analysis",
                entity_id=a.id,
                metadata={"name": a.name},
                created_at=a.updated_at,
            ))
    events.sort(key=lambda e: e.created_at, reverse=True)
    return events[:30]


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
