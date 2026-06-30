"""Report exporters — CSV and PDF (PDF via PyMuPDF, no external deps)."""

import csv
import io
from typing import Any


def to_csv(findings: list[dict[str, Any]]) -> str:
    """Findings as CSV (one row per finding)."""
    buf = io.StringIO()
    writer = csv.writer(buf)
    writer.writerow(["agent", "severity", "title", "summary", "recommendation"])
    for f in findings:
        writer.writerow([
            f.get("agent", ""), f.get("severity", ""), f.get("title", ""),
            f.get("summary", ""), f.get("recommendation", ""),
        ])
    return buf.getvalue()


# PDF layout constants
_MARGIN = 50
_LINE = 15
_FONT = 10


def _wrap(text: str, width: int = 95) -> list[str]:
    out: list[str] = []
    for para in text.split("\n"):
        if not para:
            out.append("")
            continue
        line = ""
        for word in para.split(" "):
            if len(line) + len(word) + 1 > width:
                out.append(line)
                line = word
            else:
                line = f"{line} {word}".strip()
        out.append(line)
    return out


def to_pdf(name: str, scores: dict[str, int], findings: list[dict[str, Any]]) -> bytes:
    """Render an analysis report to PDF bytes."""
    import fitz  # PyMuPDF

    doc = fitz.open()
    page = doc.new_page()
    height = page.rect.height
    y = _MARGIN

    def ensure_room(lines_needed: int = 1) -> None:
        nonlocal page, y
        if y + lines_needed * _LINE > height - _MARGIN:
            page = doc.new_page()
            y = _MARGIN

    def write(text: str, size: int = _FONT, gap: int = 0) -> None:
        nonlocal y
        for ln in _wrap(text):
            ensure_room()
            page.insert_text((_MARGIN, y), ln, fontsize=size)
            y += _LINE
        y += gap

    write(f"ArchMind AI — {name}", size=18, gap=8)
    write("Scores", size=14, gap=2)
    for k, v in (scores or {}).items():
        write(f"  {k.capitalize()}: {v}/100")
    y += 8

    write(f"Findings ({len(findings)})", size=14, gap=4)
    for f in findings:
        ensure_room(4)
        write(f"[{str(f.get('severity', '')).upper()}] {f.get('title', '')}", size=11, gap=1)
        write(f"{f.get('summary', '')}")
        write(f"Fix: {f.get('recommendation', '')}", gap=6)

    pdf_bytes = doc.tobytes()
    doc.close()
    return pdf_bytes
