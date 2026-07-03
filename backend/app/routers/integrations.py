from typing import Annotated

import httpx
from fastapi import APIRouter, BackgroundTasks, Depends, HTTPException
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Analysis, Profile, WorkspaceMember
from app.schemas import AnalysisSummary, GithubImportRequest, SlackNotifyRequest, SlackTestRequest
from app.services.github_import import import_github_repo
from app.services.pipeline import (
    check_and_increment_quota,
    ensure_default_workspace,
    increment_usage,
)
from app.services.slack import format_analysis_message, send_slack_message

router = APIRouter(prefix="/api/integrations", tags=["integrations"])


@router.post("/slack/test")
def slack_test(
    body: SlackTestRequest,
    user: Annotated[Profile, Depends(get_current_user)],
):
    try:
        send_slack_message(
            body.webhook_url,
            f":wave: ArchMind AI connected for {user.email}. Findings will land here.",
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Slack rejected the webhook. Check the URL.")
    return {"status": "sent"}


@router.post("/slack/notify")
def slack_notify(
    body: SlackNotifyRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    analysis = db.get(Analysis, body.analysis_id)
    if not analysis or not db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == analysis.workspace_id,
        WorkspaceMember.user_id == user.id,
    ).first():
        raise HTTPException(status_code=404, detail="Analysis not found")

    findings = [
        {"severity": f.severity, "title": f.title, "summary": f.summary}
        for f in analysis.findings
    ]
    text = format_analysis_message(analysis.name, analysis.scores or {}, findings)
    try:
        send_slack_message(body.webhook_url, text)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Slack rejected the webhook. Check the URL.")
    return {"status": "sent"}


@router.post("/github/import", response_model=AnalysisSummary)
def github_import(
    body: GithubImportRequest,
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    check_and_increment_quota(db, user)
    try:
        name, mermaid = import_github_repo(body.repo_url)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))
    except httpx.HTTPError:
        raise HTTPException(status_code=502, detail="Could not reach GitHub. Try again shortly.")

    ws_id = body.workspace_id
    if ws_id:
        if not db.query(WorkspaceMember).filter(
            WorkspaceMember.workspace_id == ws_id,
            WorkspaceMember.user_id == user.id,
        ).first():
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
    else:
        ws_id = ensure_default_workspace(db, user).id

    analysis = Analysis(
        workspace_id=ws_id,
        author_id=user.id,
        name=name,
        source_type="github",
        diagram_type="Mermaid",
        source_content=mermaid,
        status="queued",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    from app.routers.analyses import _run_pipeline_task, _to_summary
    background_tasks.add_task(_run_pipeline_task, analysis.id)
    return _to_summary(analysis, db)
