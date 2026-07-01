import os
import shutil
import time
import uuid
from pathlib import Path

from sqlalchemy.orm import Session

from app.config import get_settings
from app.models import Analysis, Finding, Profile, Workspace, WorkspaceMember
from app.services.agents import run_agents, AgentFinding
from app.services.diagram import build_diagram, detect_diagram_type
from app.services.mediator import run_mediator
from app.services.llm import llm_vision_extract_graph
from app.services.render import to_vision_image
from app.services.iac_review import review_iac
from app.services.api_review import review_api
from app.services.db_review import review_database

settings = get_settings()

PIPELINE_STEPS = [
    "Parsing diagram",
    "Detecting components",
    "Building dependency graph",
    "Running Scalability Agent",
    "Running Reliability Agent",
    "Running Security Agent",
    "Running Cost Agent",
    "Running DevOps Agent",
    "Running Database Agent",
    "Generating final report",
]


def ensure_upload_dir() -> Path:
    p = Path(settings.uploads_dir)
    p.mkdir(parents=True, exist_ok=True)
    return p


def ensure_default_workspace(db: Session, user: Profile) -> Workspace:
    existing = (
        db.query(Workspace)
        .join(WorkspaceMember)
        .filter(WorkspaceMember.user_id == user.id)
        .first()
    )
    if existing:
        return existing

    ws = Workspace(name="Personal", slug=f"personal-{user.id[:8]}", plan=user.plan)
    db.add(ws)
    db.flush()
    db.add(WorkspaceMember(workspace_id=ws.id, user_id=user.id, role="owner"))
    db.commit()
    db.refresh(ws)
    return ws


def save_upload(file_bytes: bytes, filename: str) -> str:
    upload_dir = ensure_upload_dir()
    safe_name = f"{uuid.uuid4().hex}_{filename}"
    path = upload_dir / safe_name
    path.write_bytes(file_bytes)
    return str(path)


def _try_vision_extract(file_path: str) -> tuple[list, list] | None:
    """Read an uploaded diagram (image, PDF, or SVG) with a vision model.

    None if the file isn't renderable, is missing, or no vision provider answered.
    """
    image = to_vision_image(file_path)
    if image is None:
        return None
    image_bytes, mime = image
    return llm_vision_extract_graph(image_bytes, mime)


def run_analysis_pipeline(db: Session, analysis_id: str) -> None:
    analysis = db.get(Analysis, analysis_id)
    if not analysis:
        return

    analysis.status = "analyzing"
    db.commit()

    # Simulate progressive pipeline (instant for MVP, structure for SSE later)
    for _ in PIPELINE_STEPS[:-1]:
        time.sleep(0.15)

    content = analysis.source_content
    if not content and analysis.file_path:
        try:
            p = Path(analysis.file_path)
            if p.exists() and p.suffix.lower() in [".tf", ".yaml", ".yml", ".json", ".sql", ".txt"]:
                content = p.read_text(encoding="utf-8", errors="ignore")
                analysis.source_content = content
        except Exception:
            pass

    diagram_type = analysis.diagram_type or detect_diagram_type(content, analysis.file_path)
    
    # Check if this is a configuration file needing review
    is_config_review = diagram_type in ["Terraform", "Kubernetes", "Docker Compose", "OpenAPI", "SQL Schema", "YAML"]
    
    if is_config_review:
        # Run specialized review
        findings_data = []
        review_result = None
        
        # Check which type to review
        if diagram_type == "Terraform":
            review_result = review_iac("Terraform", content or "")
        elif diagram_type == "Kubernetes":
            review_result = review_iac("Kubernetes", content or "")
        elif diagram_type == "Docker Compose":
            review_result = review_iac("Docker Compose", content or "")
        elif diagram_type == "OpenAPI":
            review_result = review_api(content or "")
        elif diagram_type == "SQL Schema":
            review_result = review_database(content or "")
        elif diagram_type == "YAML":
            # Autodetect content within YAML
            c_low = (content or "").lower()
            if "apiversion:" in c_low and "kind:" in c_low:
                diagram_type = "Kubernetes"
                review_result = review_iac("Kubernetes", content or "")
            elif "openapi:" in c_low or "swagger:" in c_low:
                diagram_type = "OpenAPI"
                review_result = review_api(content or "")
            elif "services:" in c_low:
                diagram_type = "Docker Compose"
                review_result = review_iac("Docker Compose", content or "")
            else:
                review_result = review_iac("Kubernetes", content or "")

        # Extract findings & scores
        rev_score = review_result.get("score", 90) if review_result else 90
        raw_findings = review_result.get("findings", []) if review_result else []
        
        for rf in raw_findings:
            findings_data.append(AgentFinding(
                agent=rf.get("agent", "maintainability"),
                severity=rf.get("severity", "medium"),
                title=rf.get("title", ""),
                summary=rf.get("summary", ""),
                recommendation=rf.get("recommendation", ""),
                node_id=None
            ))
            
        scores = {
            "scalability": rev_score,
            "security": rev_score,
            "reliability": rev_score,
            "performance": rev_score,
            "cost": rev_score,
            "maintainability": rev_score,
            "observability": rev_score
        }
        nodes = []
        edges = []
        mediator_report = None
    else:
        nodes, edges, parsed = build_diagram(content, diagram_type)

        if not parsed and analysis.file_path:
            # No text diagram to parse — if it's an image and a vision provider is
            # configured, read the diagram with a vision model instead of the sample.
            vision = _try_vision_extract(analysis.file_path)
            if vision is not None:
                nodes, edges = vision
                parsed = True

        if not parsed:
            # Still no real graph (e.g. PDF, or no vision provider) — flag the sample
            # graph so the UI never presents it as the user's own architecture.
            diagram_type = f"{diagram_type} · sample"

        findings_data, scores = run_agents(nodes, edges)
        mediator_report = run_mediator(nodes, edges, findings_data, scores)

    # Clear old findings
    db.query(Finding).filter(Finding.analysis_id == analysis_id).delete()

    for f in findings_data:
        db.add(Finding(
            analysis_id=analysis_id,
            agent=f.agent,
            severity=f.severity,
            title=f.title,
            summary=f.summary,
            recommendation=f.recommendation,
            node_id=f.node_id,
        ))

    analysis.diagram_type = diagram_type
    analysis.diagram_nodes = nodes
    analysis.diagram_edges = edges
    analysis.scores = scores
    analysis.mediator_report = mediator_report
    analysis.status = "ready"
    db.commit()


def check_analysis_quota(db: Session, user: Profile) -> None:
    if user.analyses_used >= user.analyses_limit:
        from fastapi import HTTPException
        raise HTTPException(
            status_code=402,
            detail=f"Analysis limit reached ({user.analyses_limit}). Upgrade your plan.",
        )


def increment_usage(db: Session, user: Profile) -> None:
    user.analyses_used += 1
    db.commit()
