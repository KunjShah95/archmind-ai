"""Mediator agent that synthesises findings from all 7 analysis agents.

Receives per-agent findings + scores, then calls the LLM to produce a
consolidated report with ranked findings, trade-off tensions, and confidence.
"""

from app.services.agents import AGENT_KEYS, AGENT_NAMES, AgentFinding
from app.services.llm import llm_complete, _extract_json

MEDIATOR_SYSTEM_PROMPT = (
    "You are a senior staff architect mediating a debate between 7 specialist "
    "architecture review agents: Scalability, Security, Reliability, Performance, "
    "Cost, Maintainability, and Observability. Each agent has analysed a system "
    "diagram and produced findings with severity levels and a 0-100 score.\n\n"
    "Your job is to synthesise their perspectives into a single consolidated report. "
    "For each finding:\n"
    "1. Identify which agents flagged it and whether any agents disagree\n"
    "2. Explain the trade-off when agents are in conflict\n"
    "3. Assign a confidence score (0.0-1.0) based on how many agents agree\n"
    "4. Rank findings by overall importance, not just severity\n\n"
    "Also identify the top 3-5 tensions where agents meaningfully disagree and "
    "provide a balanced resolution for each.\n\n"
    "Compute a final_score (0-100) that represents the overall architecture health "
    "considering all perspectives.\n\n"
    "Respond ONLY with valid JSON. No prose.\n"
    'Schema: {\n'
    '  "consolidated_findings": [\n'
    '    {\n'
    '      "finding": "string",\n'
    '      "severity": "low|medium|high|critical",\n'
    '      "agents_flagged": ["agent_key", ...],\n'
    '      "agents_disagree": ["agent_key", ...] | null,\n'
    '      "trade_off": "string explaining the disagreement" | null,\n'
    '      "recommendation": "string",\n'
    '      "confidence": 0.85\n'
    '    }\n'
    '  ],\n'
    '  "final_score": 72,\n'
    '  "score_by_agent": {"agent_key": 65},\n'
    '  "top_tensions": [\n'
    '    {\n'
    '      "between": ["agent_key", "agent_key"],\n'
    '      "topic": "string",\n'
    '      "resolution": "string"\n'
    '    }\n'
    '  ]\n'
    '}'
)


def _build_mediator_prompt(
    node_labels: list[str],
    edge_descriptions: list[str],
    findings_by_agent: dict[str, list[dict]],
    scores: dict[str, int],
) -> str:
    """Construct the prompt for the mediator LLM call."""
    sections = [f"Architecture has {len(node_labels)} components and {len(edge_descriptions)} connections."]

    if node_labels:
        sections.append("Components: " + ", ".join(node_labels))
    if edge_descriptions:
        sections.append("Connections: " + "; ".join(edge_descriptions[:20]))

    sections.append("\nPer-agent reports:")

    for key in AGENT_KEYS:
        name = AGENT_NAMES.get(key, key)
        agent_findings = findings_by_agent.get(key, [])
        score = scores.get(key, 0)
        sections.append(f"\n--- {name} (score: {score}) ---")
        if agent_findings:
            for f in agent_findings:
                sev = f.get("severity", "medium").upper()
                title = f.get("title", "?")
                summary = f.get("summary", "")
                sections.append(f"  [{sev}] {title}")
                sections.append(f"  {summary}")
        else:
            sections.append("  No findings flagged.")

    return "\n".join(sections)


def run_mediator(
    nodes: list[dict],
    edges: list[dict],
    findings: list[AgentFinding],
    scores: dict[str, int],
) -> dict | None:
    """Run the mediator LLM to synthesise all agent findings.

    Returns structured dict or None on failure (caller handles gracefully).
    """
    from app.services.diagram import node_labels

    labels = list(node_labels(nodes).values())
    edges_desc = _edge_descriptions(nodes, edges)

    findings_by_agent: dict[str, list[dict]] = {k: [] for k in AGENT_KEYS}
    for f in findings:
        key = f.agent if isinstance(f, AgentFinding) else f.get("agent", "?")
        if key in findings_by_agent:
            fd = f.to_dict() if isinstance(f, AgentFinding) else f
            findings_by_agent[key].append(fd)

    prompt = _build_mediator_prompt(labels, edges_desc, findings_by_agent, scores)
    result = llm_complete(MEDIATOR_SYSTEM_PROMPT, prompt)
    if not result:
        return None

    data = _extract_json(result)
    if data is None:
        return None

    if "consolidated_findings" not in data and "final_score" not in data:
        return None

    return data


def _edge_descriptions(nodes: list[dict], edges: list[dict]) -> list[str]:
    from app.services.diagram import node_labels
    labels = node_labels(nodes)
    descs: list[str] = []
    for e in edges:
        src = labels.get(e.get("source", ""), e.get("source", "?"))
        tgt = labels.get(e.get("target", ""), e.get("target", "?"))
        descs.append(f"{src} -> {tgt}")
    return descs
