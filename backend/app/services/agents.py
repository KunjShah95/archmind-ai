"""Multi-agent architecture analysis engine.

Powered by free/open-source LLM providers (Ollama, Groq, HuggingFace)
with heuristic fallback when no LLM is available.
"""

from dataclasses import dataclass
from typing import Any

from app.services.diagram import has_component, node_labels
from app.services.llm import llm_agent_analyze

AGENT_KEYS = [
    "scalability", "security", "reliability", "performance",
    "cost", "maintainability", "observability",
]

AGENT_NAMES = {
    "scalability": "Scalability Agent",
    "security": "Security Agent",
    "reliability": "Reliability Agent",
    "performance": "Performance Agent",
    "cost": "Cost Agent",
    "maintainability": "Maintainability Agent",
    "observability": "Observability Agent",
}

AGENT_DESCRIPTIONS = {
    "scalability": "Evaluates horizontal scaling, bottlenecks, and capacity headroom.",
    "security": "Audits authn/z, network exposure, secrets, and threat surface.",
    "reliability": "Checks failure modes, redundancy, SLOs, and recovery strategy.",
    "performance": "Analyzes latency, caching, query patterns, and hot paths.",
    "cost": "Estimates infra spend, idle waste, and right-sizing opportunities.",
    "maintainability": "Reviews modularity, coupling, ownership, and developer ergonomics.",
    "observability": "Inspects logs, metrics, traces, and alerting coverage.",
}

AGENT_ACCENTS = {
    "scalability": "from-sky-500 to-cyan-400",
    "security": "from-rose-500 to-orange-400",
    "reliability": "from-emerald-500 to-teal-400",
    "performance": "from-violet-500 to-indigo-400",
    "cost": "from-amber-500 to-yellow-400",
    "maintainability": "from-fuchsia-500 to-pink-400",
    "observability": "from-blue-500 to-indigo-500",
}


@dataclass
class AgentFinding:
    agent: str
    severity: str
    title: str
    summary: str
    recommendation: str
    node_id: str | None = None

    def to_dict(self) -> dict:
        return {
            "agent": self.agent,
            "severity": self.severity,
            "title": self.title,
            "summary": self.summary,
            "recommendation": self.recommendation,
            "node_id": self.node_id,
        }


def _severity_penalty(severity: str) -> int:
    return {"critical": 25, "high": 15, "medium": 8, "low": 3}.get(severity, 5)


def _heuristic_findings(nodes: list[dict], edges: list[dict]) -> list[AgentFinding]:
    """Rule-based fallback when no LLM is available."""
    labels = list(node_labels(nodes).values())
    id_by_label = {v.lower(): k for k, v in node_labels(nodes).items()}
    findings: list[AgentFinding] = []

    def nid(*keywords: str) -> str | None:
        for label, node_id in id_by_label.items():
            if any(kw in label for kw in keywords):
                return node_id
        return None

    if has_component(labels, "cdn", "cloudfront"):
        findings.append(AgentFinding(
            agent="security", severity="high",
            title="Public CDN origin may expose storage",
            summary="CDN is present without explicit signed-URL or origin access controls in the diagram.",
            recommendation="Require signed URLs at the CDN and enable bucket policy denying public ACLs.",
            node_id=nid("cdn"),
        ))
    if not has_component(labels, "auth", "identity", "cognito", "oauth"):
        findings.append(AgentFinding(
            agent="security", severity="critical",
            title="No dedicated authentication service detected",
            summary="The architecture lacks an explicit auth boundary between clients and backend services.",
            recommendation="Add an auth service or API gateway with JWT validation and rate limiting.",
            node_id=nid("api", "gateway"),
        ))

    if has_component(labels, "redis", "cache") and not has_component(labels, "multi", "cluster", "elasticache"):
        findings.append(AgentFinding(
            agent="scalability", severity="medium",
            title="Single-AZ cache dependency",
            summary="Cache layer appears as a single node without replication or failover.",
            recommendation="Move to a multi-AZ cache with automatic failover and warm replicas.",
            node_id=nid("redis", "cache"),
        ))
    if len(nodes) > 6 and not has_component(labels, "queue", "sqs", "kafka", "pubsub"):
        findings.append(AgentFinding(
            agent="scalability", severity="medium",
            title="No async decoupling layer",
            summary="Multiple services connect synchronously without a message queue.",
            recommendation="Introduce a queue between write-heavy services and workers for backpressure.",
            node_id=nid("worker", "order", "service"),
        ))

    if has_component(labels, "worker", "consumer", "processor") and not has_component(labels, "dlq", "dead"):
        findings.append(AgentFinding(
            agent="reliability", severity="critical",
            title="Missing dead-letter queue",
            summary="Async workers are present but no DLQ is shown for poison messages.",
            recommendation="Add a DLQ and alarm on DLQ depth > 0 with on-call routing.",
            node_id=nid("worker", "order"),
        ))
    if has_component(labels, "postgres", "database", "db") and not has_component(labels, "ha", "replica", "failover"):
        findings.append(AgentFinding(
            agent="reliability", severity="high",
            title="Database high availability unclear",
            summary="Primary database has no visible standby or failover path.",
            recommendation="Deploy multi-AZ RDS with automated failover and regular restore drills.",
            node_id=nid("postgres", "database", "db"),
        ))

    if len(edges) > len(nodes):
        findings.append(AgentFinding(
            agent="performance", severity="medium",
            title="Dense synchronous call graph",
            summary="High edge-to-node ratio suggests chatty synchronous dependencies.",
            recommendation="Batch requests, add caching at hot paths, and prefer async where possible.",
            node_id=nid("api", "gateway"),
        ))
    if has_component(labels, "order", "service") and has_component(labels, "database", "postgres"):
        findings.append(AgentFinding(
            agent="performance", severity="medium",
            title="Potential N+1 data access pattern",
            summary="Order service connects directly to database without a caching or batching layer.",
            recommendation="Use JOIN batching or DataLoader pattern; add read-through cache for hot queries.",
            node_id=nid("order"),
        ))

    if len(nodes) >= 7:
        findings.append(AgentFinding(
            agent="cost", severity="low",
            title="Consider right-sizing compute tier",
            summary=f"Architecture has {len(nodes)} components — review idle capacity across stateless tiers.",
            recommendation="Enable autoscaling with aggressive scale-in; use spot/preemptible for workers.",
            node_id=nid("worker"),
        ))
    if has_component(labels, "cdn") and has_component(labels, "api"):
        findings.append(AgentFinding(
            agent="cost", severity="low",
            title="CDN + API egress overlap",
            summary="Static and dynamic traffic paths may duplicate egress charges.",
            recommendation="Serve static assets entirely from CDN; keep API responses lean and compressed.",
            node_id=nid("cdn"),
        ))

    if len(nodes) > 8:
        findings.append(AgentFinding(
            agent="maintainability", severity="medium",
            title="High component count increases operational burden",
            summary="More than 8 services without clear domain boundaries.",
            recommendation="Group related services into bounded contexts; document ownership per component.",
        ))
    if not has_component(labels, "gateway", "api"):
        findings.append(AgentFinding(
            agent="maintainability", severity="low",
            title="No API gateway for cross-cutting concerns",
            summary="Services may duplicate auth, rate limiting, and routing logic.",
            recommendation="Centralize cross-cutting concerns behind an API gateway or mesh.",
            node_id=nid("api"),
        ))

    if not has_component(labels, "monitor", "observ", "datadog", "grafana", "prometheus"):
        findings.append(AgentFinding(
            agent="observability", severity="medium",
            title="No observability stack in diagram",
            summary="Logs, metrics, and traces are not represented in the architecture.",
            recommendation="Add OpenTelemetry instrumentation and centralized logging with SLO dashboards.",
            node_id=nid("api", "gateway"),
        ))
    if len(edges) >= 4:
        findings.append(AgentFinding(
            agent="observability", severity="medium",
            title="Distributed tracing likely incomplete",
            summary="Multiple service hops without an explicit tracing collector.",
            recommendation="Propagate W3C traceparent headers end-to-end with OpenTelemetry SDK.",
            node_id=nid("api", "gateway"),
        ))

    return findings


def _compute_scores(findings: list[AgentFinding]) -> dict[str, int]:
    scores: dict[str, int] = {}
    for key in AGENT_KEYS:
        base = 92
        for f in findings:
            if f.agent == key:
                base -= _severity_penalty(f.severity)
        scores[key] = max(35, min(98, base))
    return scores


def _edge_descriptions(nodes: list[dict], edges: list[dict]) -> list[str]:
    labels = node_labels(nodes)
    descs: list[str] = []
    for e in edges:
        src = labels.get(e.get("source", ""), e.get("source", "?"))
        tgt = labels.get(e.get("target", ""), e.get("target", "?"))
        descs.append(f"{src} -> {tgt}")
    return descs


def _llm_findings(nodes: list[dict], edges: list[dict]) -> tuple[list[AgentFinding], dict[str, int]] | None:
    labels = list(node_labels(nodes).values())
    edges_desc = _edge_descriptions(nodes, edges)
    all_findings: list[AgentFinding] = []
    all_llm = True

    for key in AGENT_KEYS:
        result = llm_agent_analyze(key, labels, edges_desc, len(nodes), len(edges))
        if result is None:
            all_llm = False
            continue
        llm_findings, _ = result
        for f in llm_findings:
            all_findings.append(AgentFinding(
                agent=f.get("agent", key),
                severity=f.get("severity", "medium"),
                title=f.get("title", "Unknown finding"),
                summary=f.get("summary", ""),
                recommendation=f.get("recommendation", ""),
                node_id=f.get("node_id"),
            ))

    if not all_findings:
        return None

    scores = _compute_scores(all_findings)

    if not all_llm:
        heuristic = _heuristic_findings(nodes, edges)
        existing_agents = {f.agent for f in all_findings}
        for hf in heuristic:
            if hf.agent not in existing_agents:
                all_findings.append(hf)

    return all_findings, scores


def run_agents(nodes: list[dict], edges: list[dict]) -> tuple[list[AgentFinding], dict[str, int]]:
    """Run all agents, preferring LLM analysis with heuristic fallback."""
    llm_result = _llm_findings(nodes, edges)
    if llm_result is not None:
        llm_findings, llm_scores = llm_result
        if llm_findings:
            return llm_findings, llm_scores

    heuristic = _heuristic_findings(nodes, edges)
    scores = _compute_scores(heuristic)
    return heuristic, scores


def run_single_agent(agent_key: str, nodes: list[dict], edges: list[dict]) -> tuple[list[AgentFinding], int]:
    """Run a single agent, returning findings and score."""
    labels = list(node_labels(nodes).values())
    edges_desc = _edge_descriptions(nodes, edges)

    result = llm_agent_analyze(agent_key, labels, edges_desc, len(nodes), len(edges))
    if result is not None:
        llm_findings, llm_score = result
        return [
            AgentFinding(
                agent=f.get("agent", agent_key),
                severity=f.get("severity", "medium"),
                title=f.get("title", "Unknown"),
                summary=f.get("summary", ""),
                recommendation=f.get("recommendation", ""),
                node_id=f.get("node_id"),
            )
            for f in llm_findings
        ], llm_score

    all_findings = _heuristic_findings(nodes, edges)
    agent_findings = [f for f in all_findings if f.agent == agent_key]
    score = 92 - sum(_severity_penalty(f.severity) for f in agent_findings)
    return agent_findings, max(35, min(98, score))


def chat_response(message: str, findings: list[Any], scores: dict[str, int]) -> str:
    """Context-aware chat — tries LLM first, falls back to rule-based."""
    from app.services.llm import llm_complete
    if not findings:
        return "No findings available yet. Upload a diagram to start analysis."

    findings_text = "\n".join(
        f"- [{getattr(f, 'severity', f.get('severity') if isinstance(f, dict) else '?').upper()}] "
        f"{getattr(f, 'title', f.get('title', '') if isinstance(f, dict) else '')}"
        for f in findings[:10]
    )
    scores_text = ", ".join(f"{k}: {v}" for k, v in (scores or {}).items())

    system = (
        "You are an architecture expert assistant. You have access to analysis findings and scores "
        "from 7 specialized AI agents. Answer the user's question concisely based on this data."
    )
    prompt = (
        f"Architecture scores: {scores_text}\n\n"
        f"Top findings:\n{findings_text}\n\n"
        f"User question: {message}\n\n"
        f"Answer concisely and helpfully."
    )

    llm_reply = llm_complete(system, prompt)
    if llm_reply:
        return llm_reply.strip()

    msg = message.lower()
    critical = [f for f in findings if getattr(f, "severity", f.get("severity") if isinstance(f, dict) else None) == "critical"]

    if "scale" in msg or "million" in msg or "users" in msg:
        return (
            f"Based on your current scores (scalability: {scores.get('scalability', 0)}/100), "
            "horizontal scaling of stateless tiers looks feasible, but cache and database layers need "
            "multi-AZ hardening before targeting 10M users. I'd prioritize the cache failover finding first."
        )
    if "cost" in msg or ("reduce" in msg and "spend" in msg):
        return (
            f"Cost efficiency is at {scores.get('cost', 0)}/100. Start with right-sizing workers and "
            "enabling autoscaling scale-in. Review CDN/API egress overlap to cut data transfer charges."
        )
    if "bottleneck" in msg or "slow" in msg:
        return (
            f"Performance score: {scores.get('performance', 0)}/100. The dense synchronous call graph "
            "and potential N+1 patterns on the order service are your top bottlenecks."
        )
    if critical:
        c = critical[0]
        title = c.title if hasattr(c, "title") else c.get("title", "")
        rec = c.recommendation if hasattr(c, "recommendation") else c.get("recommendation", "")
        return f"The most urgent issue is: **{title}**. {rec} Want me to draft an implementation plan?"

    avg = round(sum(scores.values()) / max(1, len(scores)))
    return (
        f"Your overall architecture health is around {avg}/100. "
        "Ask me about scalability, costs, security, bottlenecks, microservices migration, or Terraform."
    )
