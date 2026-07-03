"""Audience-tailored executive reports built from analysis results.

Deterministic markdown templates over scores/findings — no LLM call, so
reports render instantly and identically offline.
"""

from typing import Any

AUDIENCES = {
    "cto": "CTO",
    "engineering_manager": "Engineering Manager",
    "investor": "Investor",
    "product_manager": "Product Manager",
    "architect": "Solution Architect",
}

_SEVERITY_ORDER = ["critical", "high", "medium", "low"]


def _avg(scores: dict[str, int]) -> int:
    return round(sum(scores.values()) / len(scores)) if scores else 0


def _count_by_severity(findings: list[dict[str, Any]]) -> dict[str, int]:
    out: dict[str, int] = {}
    for f in findings:
        out[f["severity"]] = out.get(f["severity"], 0) + 1
    return out


def _top_findings(findings: list[dict[str, Any]], n: int = 5) -> list[dict[str, Any]]:
    return sorted(
        findings,
        key=lambda f: _SEVERITY_ORDER.index(f["severity"])
        if f["severity"] in _SEVERITY_ORDER else 9,
    )[:n]


def _risk_level(avg: int, sev: dict[str, int]) -> str:
    if sev.get("critical"):
        return "High"
    if sev.get("high") or avg < 60:
        return "Elevated"
    if avg < 80:
        return "Moderate"
    return "Low"


def build_executive_report(
    audience: str,
    name: str,
    scores: dict[str, int],
    findings: list[dict[str, Any]],
) -> dict[str, Any]:
    if audience not in AUDIENCES:
        raise ValueError(f"Unknown audience. Choose one of: {', '.join(AUDIENCES)}")

    avg = _avg(scores)
    sev = _count_by_severity(findings)
    top = _top_findings(findings)
    risk = _risk_level(avg, sev)

    lines: list[str] = [f"# {name} — {AUDIENCES[audience]} briefing", ""]

    if audience == "cto":
        lines += [
            f"**Overall architecture score: {avg}/100 · Risk level: {risk}**", "",
            "## Strategic risks",
        ]
        lines += [
            f"- **{f['title']}** ({f['severity']}) — {f['summary']}" for f in top
        ] or ["- No significant risks identified."]
        lines += ["", "## Dimension scores"]
        lines += [f"- {k.capitalize()}: {v}/100" for k, v in sorted(scores.items())]
        lines += ["", "## Recommended next quarter",
                  *(f"- {f['recommendation']}" for f in top[:3])]
    elif audience == "engineering_manager":
        lines += [
            f"**Score {avg}/100 · {len(findings)} findings "
            f"({', '.join(f'{sev.get(s,0)} {s}' for s in _SEVERITY_ORDER if sev.get(s))})**", "",
            "## Work items by priority",
        ]
        for s in _SEVERITY_ORDER:
            group = [f for f in findings if f["severity"] == s]
            if group:
                lines.append(f"### {s.capitalize()}")
                lines += [f"- [ ] {f['title']} — {f['recommendation']}" for f in group]
        lines += ["", "## Suggested sprint allocation",
                  f"- Address all critical/high findings first ({sev.get('critical',0)+sev.get('high',0)} items).",
                  "- Batch medium items into tech-debt sprints.",]
    elif audience == "investor":
        lines += [
            f"**Technology health: {avg}/100 · Risk: {risk}**", "",
            "## Summary",
            f"Independent multi-agent review across {len(scores)} architectural dimensions.",
            f"The platform shows {'strong' if avg >= 80 else 'developing' if avg >= 60 else 'early-stage'} "
            "engineering maturity.", "",
            "## Key numbers",
            f"- {len(findings)} findings; {sev.get('critical', 0)} critical.",
            f"- Strongest area: {max(scores, key=scores.get).capitalize() if scores else 'n/a'}.",
            f"- Focus area: {min(scores, key=scores.get).capitalize() if scores else 'n/a'}.",
        ]
    elif audience == "product_manager":
        lines += [
            f"**Score {avg}/100 · Risk: {risk}**", "",
            "## Impact on roadmap",
            "Findings below can affect feature velocity, reliability SLOs, and launch timelines.", "",
        ]
        lines += [
            f"- **{f['title']}** — user-facing impact: {f['summary']}" for f in top
        ] or ["- No roadmap-blocking issues found."]
    else:  # architect
        lines += [
            f"**Score {avg}/100 · Risk: {risk}**", "",
            "## Full findings",
        ]
        for f in findings:
            lines += [
                f"### {f['title']} ({f['agent']} · {f['severity']})",
                f['summary'],
                f"*Recommendation:* {f['recommendation']}", "",
            ]
        lines += ["## Scores", *(f"- {k.capitalize()}: {v}/100" for k, v in sorted(scores.items()))]

    return {
        "audience": audience,
        "audience_label": AUDIENCES[audience],
        "score": avg,
        "risk_level": risk,
        "markdown": "\n".join(lines),
    }
