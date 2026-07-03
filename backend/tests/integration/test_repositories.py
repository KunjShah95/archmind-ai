"""Tests for the repository layer."""
from datetime import datetime, timezone

import pytest

from app.models import Analysis, Finding
from app.repositories import (
    active_analyses, active_findings, soft_delete_analysis,
    get_analysis_with_findings
)


class TestActiveAnalyses:
    """Test soft-delete filtering for analyses."""

    def test_active_analyses_excludes_deleted(self, db, auth_user):
        profile, _, ws = auth_user
        # Create active analysis
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="Active", source_type="paste", source_content="test")
        db.add(a1)
        db.flush()

        # Create deleted analysis
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="Deleted", source_type="paste", source_content="test",
                     deleted_at=datetime.now(timezone.utc))
        db.add(a2)
        db.commit()

        # Query should return only active
        result = active_analyses(db)
        assert len(result) == 1
        assert result[0].id == a1.id

    def test_active_analyses_with_filters(self, db, auth_user):
        profile, _, ws = auth_user
        a1 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A1", source_type="paste", source_content="test", status="ready")
        a2 = Analysis(workspace_id=ws.id, author_id=profile.id, name="A2", source_type="paste", source_content="test", status="failed")
        db.add_all([a1, a2])
        db.commit()

        # Filter by status
        result = active_analyses(db, Analysis.status == "ready")
        assert len(result) == 1
        assert result[0].status == "ready"


class TestActiveFindings:
    """Test soft-delete filtering for findings."""

    def test_active_findings_excludes_deleted(self, db, auth_user):
        profile, _, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", source_content="test")
        db.add(a)
        db.flush()

        f1 = Finding(analysis_id=a.id, agent="scalability", severity="high", title="F1", summary="s", recommendation="r")
        f2 = Finding(analysis_id=a.id, agent="security", severity="medium", title="F2", summary="s", recommendation="r",
                    deleted_at=datetime.now(timezone.utc))
        db.add_all([f1, f2])
        db.commit()

        result = active_findings(db)
        assert len(result) == 1
        assert result[0].id == f1.id

    def test_active_findings_with_filters(self, db, auth_user):
        profile, _, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", source_content="test")
        db.add(a)
        db.flush()

        f1 = Finding(analysis_id=a.id, agent="scalability", severity="high", title="F1", summary="s", recommendation="r")
        f2 = Finding(analysis_id=a.id, agent="security", severity="low", title="F2", summary="s", recommendation="r")
        db.add_all([f1, f2])
        db.commit()

        result = active_findings(db, Finding.severity == "high")
        assert len(result) == 1
        assert result[0].severity == "high"


class TestSoftDeleteAnalysis:
    """Test soft-delete operation."""

    def test_soft_delete_sets_deleted_at(self, db, auth_user):
        profile, _, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", source_content="test")
        db.add(a)
        db.flush()

        f1 = Finding(analysis_id=a.id, agent="scalability", severity="high", title="F1", summary="s", recommendation="r")
        f2 = Finding(analysis_id=a.id, agent="security", severity="medium", title="F2", summary="s", recommendation="r")
        db.add_all([f1, f2])
        db.commit()

        # Soft delete
        soft_delete_analysis(db, a)

        # Check deleted_at is set
        db.refresh(a)
        assert a.deleted_at is not None

        # Check findings are also soft-deleted
        db.refresh(f1)
        db.refresh(f2)
        assert f1.deleted_at is not None
        assert f2.deleted_at is not None

        # active_analyses should not return it
        result = active_analyses(db)
        assert len(result) == 0


class TestGetAnalysisWithFindings:
    """Test eager-loading of analysis with findings."""

    def test_get_analysis_eager_loads_findings(self, db, auth_user):
        profile, _, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", source_content="test")
        db.add(a)
        db.flush()

        f1 = Finding(analysis_id=a.id, agent="scalability", severity="high", title="F1", summary="s", recommendation="r")
        f2 = Finding(analysis_id=a.id, agent="security", severity="medium", title="F2", summary="s", recommendation="r")
        db.add_all([f1, f2])
        db.commit()

        # Get with eager loading
        result = get_analysis_with_findings(db, a.id)
        assert result is not None
        assert len(result.findings) == 2

    def test_get_analysis_excludes_deleted(self, db, auth_user):
        profile, _, ws = auth_user
        a = Analysis(workspace_id=ws.id, author_id=profile.id, name="Test", source_type="paste", source_content="test",
                    deleted_at=datetime.now(timezone.utc))
        db.add(a)
        db.commit()

        result = get_analysis_with_findings(db, a.id)
        assert result is None

    def test_get_analysis_nonexistent(self, db):
        result = get_analysis_with_findings(db, "nonexistent-id")
        assert result is None
