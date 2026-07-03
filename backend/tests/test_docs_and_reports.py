from app.services.docs_generator import build_adr, build_doc, build_readme
from app.services.executive_report import AUDIENCES, build_executive_report
from app.services.github_import import parse_repo_url, repo_to_mermaid
from app.services.slack import format_analysis_message, validate_webhook_url

import pytest

SCORES = {"scalability": 80, "security": 60}
FINDINGS = [
    {"agent": "security", "severity": "critical", "title": "No auth boundary",
     "summary": "API is open.", "recommendation": "Add a gateway."},
    {"agent": "scalability", "severity": "medium", "title": "Single cache node",
     "summary": "Cache is a SPOF.", "recommendation": "Use a cluster."},
]
NODES = [{"id": "api", "data": {"label": "Backend API"}, "position": {"x": 0, "y": 0}}]
EDGES = [{"id": "e1", "source": "api", "target": "db"}]


class TestExecutiveReport:
    def test_all_audiences_render(self):
        for audience in AUDIENCES:
            report = build_executive_report(audience, "Test", SCORES, FINDINGS)
            assert report["audience"] == audience
            assert report["score"] == 70
            assert "Test" in report["markdown"]

    def test_critical_finding_sets_high_risk(self):
        report = build_executive_report("cto", "Test", SCORES, FINDINGS)
        assert report["risk_level"] == "High"

    def test_unknown_audience_rejected(self):
        with pytest.raises(ValueError):
            build_executive_report("ceo", "Test", SCORES, FINDINGS)


class TestDocsGenerator:
    def test_readme_contains_components_and_scores(self):
        md = build_readme("Test", NODES, EDGES, SCORES, FINDINGS)
        assert "Backend API" in md
        assert "| Security | 60/100 |" in md
        assert "No auth boundary" in md

    def test_adr_blocking_findings_condition_status(self):
        md = build_adr("Test", SCORES, FINDINGS, None)
        assert "Proposed — blocking findings open" in md
        assert "No auth boundary" in md

    def test_adr_clean_review_accepted(self):
        md = build_adr("Test", SCORES, [], None)
        assert "**Status:** Accepted" in md

    def test_build_doc_filename_sanitized(self):
        doc = build_doc("adr", "My App! (v2)", NODES, EDGES, SCORES, FINDINGS, None)
        assert doc["filename"].endswith("-adr.md")
        assert "!" not in doc["filename"]

    def test_unknown_doc_type_rejected(self):
        with pytest.raises(ValueError):
            build_doc("unknown", "Test", NODES, EDGES, SCORES, FINDINGS, None)


class TestGithubImport:
    def test_parse_repo_url_variants(self):
        assert parse_repo_url("https://github.com/owner/repo") == ("owner", "repo")
        assert parse_repo_url("github.com/owner/repo.git") == ("owner", "repo")

    def test_parse_repo_url_rejects_garbage(self):
        with pytest.raises(ValueError):
            parse_repo_url("https://gitlab.com/owner/repo")

    def test_repo_to_mermaid_detects_components(self):
        paths = ["package.json", "src/App.tsx", "backend/requirements.txt",
                 "Dockerfile", ".github/workflows/ci.yml", "backend/tests/test_x.py"]
        mermaid = repo_to_mermaid(paths)
        assert mermaid.startswith("flowchart TD")
        assert "frontend" in mermaid and "api" in mermaid
        assert "ci --> docker" in mermaid

    def test_repo_to_mermaid_empty_repo_rejected(self):
        with pytest.raises(ValueError):
            repo_to_mermaid(["LICENSE.xyz"])


class TestSlack:
    def test_validate_webhook_rejects_non_slack(self):
        with pytest.raises(ValueError):
            validate_webhook_url("https://evil.example.com/hook")

    def test_format_message_includes_scores_and_top_findings(self):
        text = format_analysis_message("Test", SCORES, FINDINGS)
        assert "*ArchMind AI — analysis complete: Test*" in text
        assert "70/100" in text
        assert "No auth boundary" in text
