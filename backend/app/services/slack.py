"""Slack incoming-webhook notifications.

Slack webhooks don't emit CORS headers, so the browser can't post to them
directly — the backend proxies the request instead.
"""

import httpx

ALLOWED_WEBHOOK_PREFIX = "https://hooks.slack.com/"

SEVERITY_EMOJI = {
    "critical": "🔴",
    "high": "🟠",
    "medium": "🟡",
    "low": "🟢",
}


def validate_webhook_url(url: str) -> str:
    """Only genuine Slack webhook URLs are allowed (SSRF guard)."""
    url = (url or "").strip()
    if not url.startswith(ALLOWED_WEBHOOK_PREFIX):
        raise ValueError("Webhook URL must start with https://hooks.slack.com/")
    return url


def send_slack_message(webhook_url: str, text: str) -> None:
    url = validate_webhook_url(webhook_url)
    resp = httpx.post(url, json={"text": text}, timeout=10.0)
    resp.raise_for_status()


def format_analysis_message(
    name: str,
    scores: dict[str, int],
    findings: list[dict],
    analysis_url: str | None = None,
) -> str:
    lines = [f"*ArchMind AI — analysis complete: {name}*"]

    if scores:
        avg = round(sum(scores.values()) / len(scores))
        lines.append(f"Overall score: *{avg}/100*")
        lines.append(
            " · ".join(f"{k.capitalize()}: {v}" for k, v in sorted(scores.items()))
        )

    by_severity: dict[str, int] = {}
    for f in findings:
        by_severity[f["severity"]] = by_severity.get(f["severity"], 0) + 1
    if by_severity:
        parts = [
            f"{SEVERITY_EMOJI.get(sev, '•')} {count} {sev}"
            for sev, count in sorted(
                by_severity.items(),
                key=lambda kv: ["critical", "high", "medium", "low"].index(kv[0])
                if kv[0] in ("critical", "high", "medium", "low") else 9,
            )
        ]
        lines.append("Findings: " + " · ".join(parts))

    top = [f for f in findings if f["severity"] in ("critical", "high")][:3]
    for f in top:
        lines.append(f"> {SEVERITY_EMOJI.get(f['severity'], '•')} *{f['title']}* — {f['summary']}")

    if analysis_url:
        lines.append(f"<{analysis_url}|Open full report>")

    return "\n".join(lines)
