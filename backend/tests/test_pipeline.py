"""Integration tests for the analysis pipeline (heuristic path, no LLM)."""

from app.models import Analysis, Finding
from app.services.agents import AGENT_KEYS
from app.services.pipeline import run_analysis_pipeline

MERMAID = (
    "graph TD\n"
    "  Client[Client] --> API[API Server]\n"
    "  API --> DB[(Postgres)]\n"
    "  API --> Cache[Redis]"
)


def _make_analysis(db, **overrides):
    data = dict(
        id="a-test-1",
        workspace_id="w-1",
        author_id="u-1",
        name="Test diagram",
        source_type="text",
        diagram_type="Mermaid",
        status="queued",
        source_content=MERMAID,
    )
    data.update(overrides)
    analysis = Analysis(**data)
    db.add(analysis)
    db.commit()
    return analysis


class TestRunAnalysisPipeline:
    def test_status_becomes_ready(self, db):
        a = _make_analysis(db)
        run_analysis_pipeline(db, a.id)
        db.refresh(a)
        assert a.status == "ready"

    def test_nodes_and_edges_persisted(self, db):
        a = _make_analysis(db)
        run_analysis_pipeline(db, a.id)
        db.refresh(a)
        assert len(a.diagram_nodes) == 4   # Client, API, DB, Cache
        assert len(a.diagram_edges) == 3

    def test_scores_populated_for_all_agents(self, db):
        a = _make_analysis(db)
        run_analysis_pipeline(db, a.id)
        db.refresh(a)
        assert set(a.scores.keys()) == set(AGENT_KEYS)

    def test_findings_written_to_db(self, db):
        a = _make_analysis(db)
        run_analysis_pipeline(db, a.id)
        rows = db.query(Finding).filter(Finding.analysis_id == a.id).all()
        assert rows
        assert all(f.agent in AGENT_KEYS for f in rows)

    def test_rerun_replaces_findings(self, db):
        a = _make_analysis(db)
        run_analysis_pipeline(db, a.id)
        first = db.query(Finding).filter(Finding.analysis_id == a.id).count()
        run_analysis_pipeline(db, a.id)
        second = db.query(Finding).filter(Finding.analysis_id == a.id).count()
        assert first == second  # cleared and rewritten, not duplicated

    def test_unparseable_source_flagged_as_sample(self, db):
        a = _make_analysis(db, diagram_type="PNG", source_content=None,
                           source_type="image", file_path="diagram.png")
        run_analysis_pipeline(db, a.id)
        db.refresh(a)
        assert a.status == "ready"
        assert "sample" in (a.diagram_type or "")

    def test_missing_analysis_is_noop(self, db):
        # Should not raise when the id does not exist.
        run_analysis_pipeline(db, "does-not-exist")
