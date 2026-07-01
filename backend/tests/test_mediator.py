"""Tests for the mediator service (no LLM key required — tests graceful fallback)."""

from app.services.mediator import run_mediator, _build_mediator_prompt, MEDIATOR_SYSTEM_PROMPT
from app.services.agents import AGENT_KEYS, AGENT_NAMES, AgentFinding


def build_sample_findings() -> list[AgentFinding]:
    return [
        AgentFinding(agent="security", severity="critical",
                     title="No WAF detected",
                     summary="Architecture lacks web application firewall.",
                     recommendation="Add WAF before API gateway.",
                     node_id="n-api"),
        AgentFinding(agent="scalability", severity="medium",
                     title="Single-AZ cache",
                     summary="Redis is single-node without failover.",
                     recommendation="Deploy multi-AZ with replica.",
                     node_id="n-cache"),
        AgentFinding(agent="cost", severity="low",
                     title="Right-size workers",
                     summary="Worker count seems high for current load.",
                     recommendation="Enable aggressive scale-in.",
                     node_id="n-worker"),
    ]


SAMPLE_NODES = [
    {"id": "n-client", "data": {"label": "Client"}},
    {"id": "n-api", "data": {"label": "API Server"}},
    {"id": "n-cache", "data": {"label": "Redis"}},
    {"id": "n-db", "data": {"label": "Postgres"}},
]
SAMPLE_EDGES = [
    {"id": "e0", "source": "n-client", "target": "n-api"},
    {"id": "e1", "source": "n-api", "target": "n-cache"},
    {"id": "e2", "source": "n-api", "target": "n-db"},
]


class TestBuildMediatorPrompt:
    def test_includes_component_count(self):
        prompt = _build_mediator_prompt(
            ["Client", "API"], ["Client -> API"],
            {"security": [{"severity": "high", "title": "No auth"}]},
            {"security": 50},
        )
        assert "2 components" in prompt
        assert "1 connections" in prompt

    def test_includes_all_agent_sections(self):
        prompt = _build_mediator_prompt(
            [], [], {}, {k: 90 for k in AGENT_KEYS},
        )
        for key in AGENT_KEYS:
            assert AGENT_NAMES.get(key, key) in prompt

    def test_handles_empty_findings(self):
        prompt = _build_mediator_prompt(
            ["Client"], ["Client -> API"],
            {"security": []}, {"security": 95},
        )
        assert "No findings flagged" in prompt


class TestRunMediator:
    def test_returns_none_when_no_llm(self):
        """With no LLM provider configured, mediator returns None (graceful fallback)."""
        result = run_mediator(SAMPLE_NODES, SAMPLE_EDGES,
                              build_sample_findings(),
                              {"security": 60, "scalability": 75, "cost": 85})
        assert result is None

    def test_handles_empty_findings_gracefully(self):
        result = run_mediator(SAMPLE_NODES, SAMPLE_EDGES, [],
                              {k: 92 for k in AGENT_KEYS})
        assert result is None

    def test_handles_empty_graph_gracefully(self):
        result = run_mediator([], [], build_sample_findings(),
                              {"security": 60, "cost": 85})
        assert result is None
