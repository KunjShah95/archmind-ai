import json
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session

from app.auth import get_current_user
from app.database import get_db
from app.models import Analysis, ChatMessage, Finding, Profile, WorkspaceMember
from app.schemas import (
    AnalysisDetail,
    AnalysisSummary,
    ChatMessageOut,
    ChatRequest,
    CreateAnalysisBody,
    FindingOut,
)
from app.services.agents import (
    AGENT_KEYS, AGENT_NAMES, AGENT_DESCRIPTIONS, AGENT_ACCENTS,
    chat_response, run_single_agent,
)
from app.services.diagram import detect_diagram_type
from app.services.pipeline import (
    check_analysis_quota,
    ensure_default_workspace,
    increment_usage,
    run_analysis_pipeline,
    save_upload,
)
from app.config import get_settings

router = APIRouter(prefix="/api/analyses", tags=["analyses"])
settings = get_settings()


def _to_summary(a: Analysis, db: Session) -> AnalysisSummary:
    ws = a.workspace
    author = a.author
    return AnalysisSummary(
        id=a.id,
        name=a.name,
        diagram_type=a.diagram_type,
        status=a.status,
        scores=a.scores or {},
        workspace=ws.name if ws else "Unknown",
        workspace_id=a.workspace_id,
        author=author.full_name or author.email if author else "Unknown",
        author_id=a.author_id,
        uploaded_at=a.created_at,
    )


def _user_can_access(db: Session, user_id: str, analysis: Analysis) -> bool:
    return db.query(WorkspaceMember).filter(
        WorkspaceMember.workspace_id == analysis.workspace_id,
        WorkspaceMember.user_id == user_id,
    ).first() is not None


@router.get("", response_model=list[AnalysisSummary])
def list_analyses(
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    q: str | None = None,
):
    ws_ids = [m.workspace_id for m in db.query(WorkspaceMember).filter(WorkspaceMember.user_id == user.id).all()]
    if not ws_ids:
        return []
    query = db.query(Analysis).filter(Analysis.workspace_id.in_(ws_ids)).order_by(Analysis.created_at.desc())
    if q:
        query = query.filter(Analysis.name.ilike(f"%{q}%"))
    return [_to_summary(a, db) for a in query.all()]


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def get_analysis(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")
    summary = _to_summary(a, db)
    return AnalysisDetail(
        **summary.model_dump(),
        source_type=a.source_type,
        diagram_nodes=a.diagram_nodes or [],
        diagram_edges=a.diagram_edges or [],
        findings=[FindingOut.model_validate(f) for f in a.findings],
    )


@router.post("", response_model=AnalysisSummary)
def create_analysis_json(
    body: CreateAnalysisBody,
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    check_analysis_quota(db, user)
    ws_id = body.workspace_id
    if ws_id:
        if not db.query(WorkspaceMember).filter(WorkspaceMember.workspace_id == ws_id, WorkspaceMember.user_id == user.id).first():
            raise HTTPException(status_code=403, detail="Not a member of this workspace")
    else:
        ws_id = ensure_default_workspace(db, user).id

    if body.source_type == "paste" and not (body.source_content and body.source_content.strip()):
        raise HTTPException(status_code=400, detail="Diagram content is required")

    diagram_type = body.diagram_type or detect_diagram_type(body.source_content, None)
    analysis = Analysis(
        workspace_id=ws_id,
        author_id=user.id,
        name=body.name,
        source_type=body.source_type,
        diagram_type=diagram_type,
        source_content=body.source_content,
        status="queued",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    increment_usage(db, user)
    background_tasks.add_task(_run_pipeline_task, analysis.id)
    return _to_summary(analysis, db)


@router.post("/upload", response_model=AnalysisSummary)
async def create_analysis_upload(
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
    file: UploadFile = File(...),
    name: str = Form("Untitled architecture"),
    workspace_id: str | None = Form(None),
):
    check_analysis_quota(db, user)
    content = await file.read()
    if len(content) > settings.max_upload_bytes:
        raise HTTPException(status_code=400, detail="File exceeds 25 MB limit")
    if not content:
        raise HTTPException(status_code=400, detail="Empty file")

    ws_id = workspace_id or ensure_default_workspace(db, user).id
    path = save_upload(content, file.filename or "diagram.png")
    diagram_type = detect_diagram_type(None, file.filename)

    analysis = Analysis(
        workspace_id=ws_id,
        author_id=user.id,
        name=name,
        source_type="upload",
        diagram_type=diagram_type,
        file_path=path,
        status="queued",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)
    increment_usage(db, user)
    background_tasks.add_task(_run_pipeline_task, analysis.id)
    return _to_summary(analysis, db)


def _run_pipeline_task(analysis_id: str) -> None:
    from app.database import SessionLocal
    db = SessionLocal()
    try:
        run_analysis_pipeline(db, analysis_id)
    finally:
        db.close()


@router.post("/{analysis_id}/chat", response_model=ChatMessageOut)
def post_chat(
    analysis_id: str,
    body: ChatRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    db.add(ChatMessage(analysis_id=analysis_id, user_id=user.id, role="user", content=body.message))
    reply = chat_response(body.message, a.findings, a.scores or {})
    msg = ChatMessage(analysis_id=analysis_id, user_id=None, role="assistant", content=reply)
    db.add(msg)
    db.commit()
    db.refresh(msg)
    return ChatMessageOut.model_validate(msg)


@router.get("/{analysis_id}/chat", response_model=list[ChatMessageOut])
def get_chat(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")
    return [ChatMessageOut.model_validate(m) for m in a.messages]


@router.get("/{analysis_id}/export/{fmt}")
def export_analysis(
    analysis_id: str,
    fmt: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    data = {
        "name": a.name,
        "status": a.status,
        "scores": a.scores,
        "findings": [
            {"agent": f.agent, "severity": f.severity, "title": f.title,
             "summary": f.summary, "recommendation": f.recommendation}
            for f in a.findings
        ],
    }

    if fmt == "json":
        return Response(content=json.dumps(data, indent=2), media_type="application/json",
                        headers={"Content-Disposition": f'attachment; filename="{a.name}.json"'})
    if fmt == "markdown":
        lines = [f"# {a.name}\n", "## Scores\n"]
        for k, v in (a.scores or {}).items():
            lines.append(f"- **{k}**: {v}/100")
        lines.append("\n## Findings\n")
        for f in a.findings:
            lines.append(f"### [{f.severity.upper()}] {f.title}\n{f.summary}\n\n**Fix:** {f.recommendation}\n")
        md = "\n".join(lines)
        return Response(content=md, media_type="text/markdown",
                        headers={"Content-Disposition": f'attachment; filename="{a.name}.md"'})
    if fmt == "html":
        html = f"<html><body><h1>{a.name}</h1><pre>{json.dumps(data, indent=2)}</pre></body></html>"
        return Response(content=html, media_type="text/html",
                        headers={"Content-Disposition": f'attachment; filename="{a.name}.html"'})
    if fmt == "csv":
        from app.services.export import to_csv
        return Response(content=to_csv(data["findings"]), media_type="text/csv",
                        headers={"Content-Disposition": f'attachment; filename="{a.name}.csv"'})
    if fmt == "pdf":
        from app.services.export import to_pdf
        pdf = to_pdf(a.name, a.scores or {}, data["findings"])
        return Response(content=pdf, media_type="application/pdf",
                        headers={"Content-Disposition": f'attachment; filename="{a.name}.pdf"'})
    raise HTTPException(status_code=400, detail="Unsupported format. Use json, markdown, html, csv, or pdf")


@router.get("/agents/meta")
def list_agents():
    return [
        {"key": k, "name": AGENT_NAMES.get(k, k), "description": AGENT_DESCRIPTIONS.get(k, ""),
         "accent": AGENT_ACCENTS.get(k, ""), "icon": {
             "scalability": "TrendingUp", "security": "ShieldCheck", "reliability": "HeartPulse",
             "performance": "Gauge", "cost": "DollarSign", "maintainability": "Wrench",
             "observability": "Activity",
         }.get(k, "Sparkles")}
        for k in AGENT_KEYS
    ]


@router.get("/{analysis_id}/agents/{agent_key}")
def get_agent_report(
    analysis_id: str,
    agent_key: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    if agent_key not in AGENT_KEYS:
        raise HTTPException(status_code=404, detail=f"Unknown agent: {agent_key}")

    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    existing = [f for f in a.findings if f.agent == agent_key]
    score = (a.scores or {}).get(agent_key, 0)

    if not existing and a.status == "ready":
        findings_data, score = run_single_agent(agent_key, a.diagram_nodes or [], a.diagram_edges or [])
        if a.scores is None:
            a.scores = {}
        a.scores[agent_key] = score
        for f_data in findings_data:
            db.add(Finding(
                analysis_id=analysis_id, agent=f_data.agent,
                severity=f_data.severity, title=f_data.title,
                summary=f_data.summary, recommendation=f_data.recommendation,
                node_id=f_data.node_id,
            ))
        db.commit()
        existing = [f for f in a.findings if f.agent == agent_key]

    return {
        "agent_key": agent_key,
        "agent_name": AGENT_NAMES.get(agent_key, agent_key),
        "agent_description": AGENT_DESCRIPTIONS.get(agent_key, ""),
        "agent_accent": AGENT_ACCENTS.get(agent_key, ""),
        "score": score,
        "findings": [
            {"id": f.id, "agent": f.agent, "severity": f.severity, "title": f.title,
             "summary": f.summary, "recommendation": f.recommendation, "node_id": f.node_id}
            for f in existing
        ],
        "analysis_name": a.name,
        "analysis_id": a.id,
        "node_count": len(a.diagram_nodes or []),
        "edge_count": len(a.diagram_edges or []),
        "diagram_type": a.diagram_type,
    }
