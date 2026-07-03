"""Repository layer with soft-delete filtering."""
from sqlalchemy.orm import Session
from app.models import Analysis, Finding


def active_analyses(db: Session, *filters) -> list[Analysis]:
    """Return analyses with deleted_at IS NULL."""
    query = db.query(Analysis).filter(Analysis.deleted_at.is_(None))
    for f in filters:
        query = query.filter(f)
    return query.all()


def active_findings(db: Session, *filters) -> list[Finding]:
    """Return findings with deleted_at IS NULL."""
    query = db.query(Finding).filter(Finding.deleted_at.is_(None))
    for f in filters:
        query = query.filter(f)
    return query.all()


def soft_delete_analysis(db: Session, analysis: Analysis) -> None:
    """Soft-delete an analysis and its findings."""
    from datetime import datetime, timezone
    now = datetime.now(timezone.utc)
    analysis.deleted_at = now
    for finding in analysis.findings:
        finding.deleted_at = now
    db.commit()


def get_analysis_with_findings(db: Session, analysis_id: str) -> Analysis | None:
    """Get analysis eager-loading findings (N+1 prevention)."""
    from sqlalchemy.orm import joinedload
    return (
        db.query(Analysis)
        .options(joinedload(Analysis.findings))
        .filter(Analysis.id == analysis_id, Analysis.deleted_at.is_(None))
        .first()
    )
