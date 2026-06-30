"""Tests for CSV and PDF report exporters."""

from app.services.export import to_csv, to_pdf

FINDINGS = [
    {"agent": "security", "severity": "critical", "title": "No auth",
     "summary": "Missing auth boundary.", "recommendation": "Add an auth gateway."},
    {"agent": "scalability", "severity": "medium", "title": "Single cache",
     "summary": "Cache is a single node.", "recommendation": "Use multi-AZ."},
]
SCORES = {"security": 40, "scalability": 70}


class TestToCsv:
    def test_header_and_rows(self):
        csv = to_csv(FINDINGS)
        lines = csv.strip().splitlines()
        assert lines[0] == "agent,severity,title,summary,recommendation"
        assert len(lines) == 3  # header + 2

    def test_empty_findings_just_header(self):
        assert to_csv([]).strip() == "agent,severity,title,summary,recommendation"

    def test_commas_escaped(self):
        csv = to_csv([{"agent": "a", "severity": "low", "title": "x, y",
                       "summary": "s", "recommendation": "r"}])
        assert '"x, y"' in csv


class TestToPdf:
    def test_returns_pdf_bytes(self):
        pdf = to_pdf("Test Arch", SCORES, FINDINGS)
        assert pdf[:5] == b"%PDF-"
        assert len(pdf) > 500

    def test_handles_empty(self):
        pdf = to_pdf("Empty", {}, [])
        assert pdf[:5] == b"%PDF-"

    def test_long_text_paginates(self):
        big = [{"agent": "x", "severity": "low", "title": f"Finding {i}",
                "summary": "lorem ipsum " * 30, "recommendation": "do thing " * 20}
               for i in range(40)]
        pdf = to_pdf("Big", SCORES, big)
        assert pdf[:5] == b"%PDF-"
