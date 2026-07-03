import json
import secrets
from typing import Annotated

from fastapi import APIRouter, BackgroundTasks, Depends, File, Form, HTTPException, Request, UploadFile
from fastapi.responses import Response
from sqlalchemy.orm import Session, joinedload

from app.auth import get_current_user
from app.database import get_db
from app.limiter import limiter
from app.models import Analysis, ChatMessage, Finding, Profile, ShareLink, WorkspaceMember
from app.schemas import (
    AnalysisDetail,
    AnalysisSummary,
    AuditEventOut,
    ChatMessageOut,
    ChatRequest,
    CreateAnalysisBody,
    FindingOut,
    GenerateRequest,
    RedesignRequest,
    RedesignResult,
    ComponentExplanation,
    ArchitectureWalkthrough,
    ChaosRequest,
    DebateRequest,
    PairArchitectRequest,
    ShareLinkOut,
    VersionOut,
)
from app.services.agents import (
    AGENT_KEYS, AGENT_NAMES, AGENT_DESCRIPTIONS, AGENT_ACCENTS,
    chat_response, run_single_agent,
)
from app.services.diagram import detect_diagram_type
from app.services.pipeline import (
    check_and_increment_quota,
    ensure_default_workspace,
    increment_usage,
    release_analysis_slot,
    run_analysis_pipeline,
    save_upload,
)
from app.services.generator import generate_architecture, architecture_to_graph
from app.services.redesign import redesign_architecture, STRATEGIES
from app.services.learning import explain_component, explain_architecture
from app.services.simulation import simulate_traffic
from app.services.chaos import simulate_failure
from app.services.knowledge_graph import get_node_dependencies, compute_impact_matrix
from app.services.debate import run_debate
from app.services.benchmarks import benchmark_architecture
from app.services.cicd import process_github_pr_webhook
from app.services.cloud_scanner import scan_live_infrastructure, compare_actual_vs_intended
from app.services.finops import calculate_finops_projections
from app.services.compliance import audit_compliance_frameworks
from app.services.pair_architect import run_pair_architect
from app.services.executive_report import build_executive_report
from app.services.docs_generator import build_doc
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
    query = db.query(Analysis).options(joinedload(Analysis.workspace), joinedload(Analysis.author)).filter(Analysis.workspace_id.in_(ws_ids)).order_by(Analysis.created_at.desc())
    if q:
        query = query.filter(Analysis.name.ilike(f"%{q}%"))
    return [_to_summary(a, db) for a in query.all()]


@router.get("/{analysis_id}", response_model=AnalysisDetail)
def get_analysis(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.query(Analysis).options(joinedload(Analysis.findings)).filter(Analysis.id == analysis_id).first()
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")
    summary = _to_summary(a, db)
    return AnalysisDetail(
        **summary.model_dump(),
        source_type=a.source_type,
        diagram_nodes=a.diagram_nodes or [],
        diagram_edges=a.diagram_edges or [],
        findings=[FindingOut.model_validate(f) for f in a.findings],
        analysis_mode=a.analysis_mode or "review",
        generation_prompt=a.generation_prompt,
        generated_artifacts=a.generated_artifacts,
        mediator_report=a.mediator_report,
    )


@router.post("", response_model=AnalysisSummary)
@limiter.limit("20/minute")
def create_analysis_json(
    request: Request,
    body: CreateAnalysisBody,
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    check_and_increment_quota(db, user)
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
    check_and_increment_quota(db, user)
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
    background_tasks.add_task(_run_pipeline_task, analysis.id)
    return _to_summary(analysis, db)


def _run_pipeline_task(analysis_id: str) -> None:
    from app.database import SessionLocal
    from app.observability import get_logger
    db = SessionLocal()
    logger = get_logger(analysis_id=analysis_id)
    try:
        run_analysis_pipeline(db, analysis_id)
    except Exception:
        logger.exception("pipeline_task_crashed")
        try:
            analysis = db.get(Analysis, analysis_id)
            if analysis and analysis.status != "failed":
                analysis.status = "failed"
                analysis.error_code = "PIPELINE_CRASHED"
                analysis.error_message = "Pipeline crashed with unhandled exception"
                # Compensate: release the quota slot
                if analysis.author:
                    release_analysis_slot(db, analysis.author)
                db.commit()
        except Exception:
            db.rollback()
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

    # Build chat history for multi-turn context
    history = [
        {"role": m.role, "content": m.content}
        for m in a.messages
    ]

    db.add(ChatMessage(analysis_id=analysis_id, user_id=user.id, role="user", content=body.message))
    reply = chat_response(
        body.message,
        a.findings,
        a.scores or {},
        nodes=a.diagram_nodes,
        edges=a.diagram_edges,
        chat_history=history,
        generated_artifacts=a.generated_artifacts,
    )
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


# ── Phase 1: AI Architecture Generator ──

@router.post("/generate", response_model=AnalysisSummary)
def generate_analysis(
    body: GenerateRequest,
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Generate a complete architecture from a natural language description."""
    check_and_increment_quota(db, user)
    ws = ensure_default_workspace(db, user)

    # Generate the architecture
    arch = generate_architecture(
        body.prompt,
        body.target_users,
        body.cloud_provider,
        body.constraints,
    )

    # Parse the generated diagram into nodes/edges
    nodes, edges = architecture_to_graph(arch)

    # Create a descriptive name from the prompt
    name = body.prompt[:60].strip()
    if len(body.prompt) > 60:
        name += "..."

    analysis = Analysis(
        workspace_id=ws.id,
        author_id=user.id,
        name=name,
        source_type="generated",
        source_content=arch.get("diagram_mermaid", ""),
        diagram_type="Mermaid",
        diagram_nodes=nodes,
        diagram_edges=edges,
        analysis_mode="generate",
        generation_prompt=body.prompt,
        generated_artifacts={
            "tech_stack": arch.get("tech_stack", {}),
            "database_choices": arch.get("database_choices", []),
            "api_design": arch.get("api_design", {}),
            "queue_system": arch.get("queue_system", {}),
            "cdn_strategy": arch.get("cdn_strategy", {}),
            "kubernetes_manifest": arch.get("kubernetes_manifest", ""),
            "terraform_starter": arch.get("terraform_starter", ""),
        },
        status="queued",
    )
    db.add(analysis)
    db.commit()
    db.refresh(analysis)

    # Queue the review pipeline to also analyze the generated architecture
    background_tasks.add_task(_run_pipeline_task, analysis.id)
    return _to_summary(analysis, db)


# ── Phase 1: Architecture Redesign ──

@router.get("/redesign/strategies")
def list_strategies():
    """List available redesign strategies."""
    return [
        {"key": k, **v}
        for k, v in STRATEGIES.items()
    ]


@router.post("/{analysis_id}/redesign")
def redesign_analysis(
    analysis_id: str,
    body: RedesignRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Redesign an architecture using a specific optimization strategy."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    if body.strategy not in STRATEGIES:
        raise HTTPException(
            status_code=400,
            detail=f"Unknown strategy: {body.strategy}. Use one of: {', '.join(STRATEGIES.keys())}",
        )

    result = redesign_architecture(
        a.diagram_nodes or [],
        a.diagram_edges or [],
        body.strategy,
    )
    return result


# ── Phase 1: Learning Mode ──

@router.get("/{analysis_id}/learn")
def get_architecture_walkthrough(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get a full educational walkthrough of the architecture."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return explain_architecture(a.diagram_nodes or [], a.diagram_edges or [])


@router.get("/{analysis_id}/learn/{node_id}")
def get_component_explanation(
    analysis_id: str,
    node_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get an educational explanation for a specific component."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    nodes = a.diagram_nodes or []
    node_ids = {n["id"] for n in nodes}
    if node_id not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found in this analysis")

    return explain_component(node_id, nodes, a.diagram_edges or [])


# ── Phase 2: Traffic Simulation ──

@router.post("/{analysis_id}/simulate")
def run_traffic_simulation(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Run traffic simulations for 1K, 100K, 1M, 10M, and 100M users."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return simulate_traffic(a.diagram_nodes or [], a.diagram_edges or [])


# ── Phase 2: Failure Simulator ──

@router.post("/{analysis_id}/chaos")
def run_failure_simulation(
    analysis_id: str,
    body: ChaosRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Simulate the failure of a specific component and calculate blast radius."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    nodes = a.diagram_nodes or []
    node_ids = {n["id"] for n in nodes}
    if body.failed_node_id not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{body.failed_node_id}' not found in this analysis")

    return simulate_failure(nodes, a.diagram_edges or [], body.failed_node_id)


# ── Phase 2: Knowledge Graph ──

@router.get("/{analysis_id}/graph/dependencies/{node_id}")
def get_node_deps(
    analysis_id: str,
    node_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get upstream and downstream dependency lists for a given node."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    nodes = a.diagram_nodes or []
    node_ids = {n["id"] for n in nodes}
    if node_id not in node_ids:
        raise HTTPException(status_code=404, detail=f"Node '{node_id}' not found in this analysis")

    return get_node_dependencies(nodes, a.diagram_edges or [], node_id)


@router.get("/{analysis_id}/graph/impact")
def get_graph_impact_matrix(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Calculate centrality metrics and impact scores for all nodes."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return compute_impact_matrix(a.diagram_nodes or [], a.diagram_edges or [])


# ── Phase 2: Multi-Agent Debate ──

@router.post("/{analysis_id}/debate")
def debate_topic(
    analysis_id: str,
    body: DebateRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Simulate a debate between 4 agents about a design dilemma."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return run_debate(body.topic, a.diagram_nodes or [])


# ── Phase 2: Architecture Benchmarks ──

@router.post("/{analysis_id}/benchmark")
def run_architecture_benchmark(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Compare architecture against industry standard large-scale system patterns."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return benchmark_architecture(a.diagram_nodes or [], a.diagram_edges or [])


# ── Phase 3: CI/CD PR Review Webhook ──

@router.get("/{analysis_id}/report/{audience}")
def get_executive_report(
    analysis_id: str,
    audience: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Audience-tailored briefing (cto, engineering_manager, investor, product_manager, architect)."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")
    findings = [
        {
            "agent": f.agent, "severity": f.severity, "title": f.title,
            "summary": f.summary, "recommendation": f.recommendation,
        }
        for f in a.findings
    ]
    try:
        return build_executive_report(audience, a.name, a.scores or {}, findings)
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.get("/{analysis_id}/docs/{doc_type}")
def get_generated_doc(
    analysis_id: str,
    doc_type: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Generate architecture documentation (readme or adr) as markdown."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")
    findings = [
        {
            "agent": f.agent, "severity": f.severity, "title": f.title,
            "summary": f.summary, "recommendation": f.recommendation,
        }
        for f in a.findings
    ]
    try:
        return build_doc(
            doc_type, a.name, a.diagram_nodes or [], a.diagram_edges or [],
            a.scores or {}, findings, a.mediator_report,
        )
    except ValueError as e:
        raise HTTPException(status_code=400, detail=str(e))


@router.post("/integrations/webhook/github")
def github_pr_webhook(payload: dict):
    """Exposes a webhook receiver for GitHub pull requests to automatically review code changes."""
    return process_github_pr_webhook(payload)


# ── Phase 4: Live Cloud Integration ──

@router.post("/{analysis_id}/cloud/scan")
def scan_cloud_drift(
    analysis_id: str,
    provider: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Scan live cloud resource configuration details and map them to design templates."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    actual = scan_live_infrastructure(provider, {})
    return compare_actual_vs_intended(a.diagram_nodes or [], a.diagram_edges or [], actual)


# ── Phase 4: FinOps Cost optimization ──

@router.get("/{analysis_id}/finops")
def get_finops_analysis(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get FinOps cost projections and rightsizing recommendations."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return calculate_finops_projections(a.diagram_nodes or [], a.diagram_edges or [])


# ── Phase 4: Compliance Audits ──

@router.get("/{analysis_id}/compliance")
def get_compliance_audit(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Get compliance readiness evaluations for SOC 2, ISO, GDPR, HIPAA, and PCI DSS."""
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return audit_compliance_frameworks(a.diagram_nodes or [], a.diagram_edges or [])


# ── Phase 4: AI Pair Architect ──

@router.post("/pair-architect")
def co_design_session(
    body: PairArchitectRequest,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    """Co-design systems iteratively with the AI Pair Architect."""
    return run_pair_architect(body.current_mermaid, body.history, body.new_message)


# ── Phase 3B: Audit Trail ──

@router.get("/{analysis_id}/audit", response_model=list[AuditEventOut])
def get_audit_trail(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    author = db.query(Profile).filter(Profile.id == a.author_id).first()
    actor_name = author.full_name or author.email if author else "Unknown"
    actor_email = author.email if author else ""
    events: list[AuditEventOut] = [
        AuditEventOut(
            id=f"create-{a.id}",
            actor=actor_name,
            actor_email=actor_email,
            action="analysis.created",
            entity_type="analysis",
            entity_id=a.id,
            metadata={"name": a.name, "source_type": a.source_type},
            created_at=a.created_at,
        )
    ]
    if a.status == "ready":
        events.append(AuditEventOut(
            id=f"ready-{a.id}",
            actor="ArchMind AI",
            actor_email="ai@archmind.io",
            action="analysis.completed",
            entity_type="analysis",
            entity_id=a.id,
            metadata={"score_keys": list((a.scores or {}).keys())},
            created_at=a.updated_at,
        ))
    findings = db.query(Finding).filter(Finding.analysis_id == a.id).all()
    for f in findings[:10]:
        events.append(AuditEventOut(
            id=f"finding-{f.id}",
            actor="ArchMind AI",
            actor_email="ai@archmind.io",
            action="finding.created",
            entity_type="finding",
            entity_id=f.id,
            metadata={"title": f.title, "severity": f.severity, "agent": f.agent},
            created_at=a.updated_at,
        ))
    events.sort(key=lambda e: e.created_at, reverse=True)
    return events


# ── Phase 3B: Version History ──

@router.get("/{analysis_id}/versions", response_model=list[VersionOut])
def get_versions(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    author = db.query(Profile).filter(Profile.id == a.author_id).first()
    versions = [
        VersionOut(
            id=f"v1-{a.id}",
            version_no=1,
            change_type="initial",
            summary="Initial analysis created",
            author=author.full_name or author.email if author else "Unknown",
            author_id=a.author_id,
            created_at=a.created_at,
            scores={},
        )
    ]
    if a.status == "ready":
        versions.append(VersionOut(
            id=f"v2-{a.id}",
            version_no=2,
            change_type="analysis_complete",
            summary="Analysis pipeline completed — scores and findings generated",
            author="ArchMind AI",
            author_id="system",
            created_at=a.updated_at,
            scores=a.scores or {},
        ))
    versions.sort(key=lambda v: v.version_no, reverse=True)
    return versions


# ── Phase 3B: Share Link ──

@router.post("/{analysis_id}/share", response_model=ShareLinkOut)
def create_share_link(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    token = secrets.token_urlsafe(24)
    link = ShareLink(analysis_id=analysis_id, token=token, scope="read", created_by=user.id)
    db.add(link)
    db.commit()
    db.refresh(link)
    return ShareLinkOut(token=link.token, url=f"/shared/{link.token}", scope=link.scope)


@router.get("/shared/{token}")
def get_shared_analysis(token: str, db: Annotated[Session, Depends(get_db)]):
    link = db.query(ShareLink).filter(ShareLink.token == token).first()
    if not link:
        raise HTTPException(status_code=404, detail="Share link not found or expired")
    a = db.query(Analysis).options(
        joinedload(Analysis.findings),
        joinedload(Analysis.workspace),
        joinedload(Analysis.author),
    ).filter(Analysis.id == link.analysis_id).first()
    if not a:
        raise HTTPException(status_code=404, detail="Analysis not found")
    ws = a.workspace
    author = a.author
    return {
        "id": a.id,
        "name": a.name,
        "diagram_type": a.diagram_type,
        "status": a.status,
        "scores": a.scores or {},
        "workspace": ws.name if ws else "Unknown",
        "author": author.full_name or author.email if author else "Unknown",
        "uploaded_at": a.created_at.isoformat(),
        "diagram_nodes": a.diagram_nodes or [],
        "diagram_edges": a.diagram_edges or [],
        "findings": [
            {
                "id": f.id, "agent": f.agent, "severity": f.severity,
                "title": f.title, "summary": f.summary, "recommendation": f.recommendation,
            }
            for f in (a.findings or [])
        ],
        "mediator_report": a.mediator_report,
    }


# ── Phase 3B: Retry & Status ──

@router.post("/{analysis_id}/retry", response_model=AnalysisSummary)
def retry_analysis(
    analysis_id: str,
    background_tasks: BackgroundTasks,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    a.status = "queued"
    a.error_code = None
    a.error_message = None
    a.failed_step = None
    db.commit()

    background_tasks.add_task(_run_pipeline_task, analysis_id)
    return _to_summary(a, db)


@router.get("/{analysis_id}/status")
def get_analysis_status(
    analysis_id: str,
    user: Annotated[Profile, Depends(get_current_user)],
    db: Annotated[Session, Depends(get_db)],
):
    a = db.get(Analysis, analysis_id)
    if not a or not _user_can_access(db, user.id, a):
        raise HTTPException(status_code=404, detail="Analysis not found")

    return {
        "id": a.id,
        "status": a.status,
        "error_code": a.error_code,
        "error_message": a.error_message,
        "failed_step": a.failed_step,
    }



