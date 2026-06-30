"""Tests for the heuristic agent engine (no LLM key required)."""

from app.services.agents import AGENT_KEYS, AgentFinding, run_agents

VALID_SEVERITIES = {"low", "medium", "high", "critical"}

# Architecture missing auth, single-AZ cache, no queue — triggers known rules.
RISKY_NODES = [
    {"id": "n-client", "data": {"label": "Client"}},
    {"id": "n-cdn", "data": {"label": "CDN"}},
    {"id": "n-api", "data": {"label": "API Server"}},
    {"id": "n-cache", "data": {"label": "Redis"}},
    {"id": "n-db", "data": {"label": "Postgres"}},
]
RISKY_EDGES = [
    {"id": "e0", "source": "n-client", "target": "n-cdn"},
    {"id": "e1", "source": "n-cdn", "target": "n-api"},
    {"id": "e2", "source": "n-api", "target": "n-cache"},
    {"id": "e3", "source": "n-api", "target": "n-db"},
]


class TestRunAgents:
    def test_scores_cover_all_agents(self):
        _, scores = run_agents(RISKY_NODES, RISKY_EDGES)
        assert set(scores.keys()) == set(AGENT_KEYS)

    def test_scores_in_range(self):
        _, scores = run_agents(RISKY_NODES, RISKY_EDGES)
        assert all(35 <= v <= 98 for v in scores.values())

    def test_findings_are_agentfindings(self):
        findings, _ = run_agents(RISKY_NODES, RISKY_EDGES)
        assert findings
        assert all(isinstance(f, AgentFinding) for f in findings)

    def test_finding_fields_valid(self):
        findings, _ = run_agents(RISKY_NODES, RISKY_EDGES)
        for f in findings:
            assert f.agent in AGENT_KEYS
            assert f.severity in VALID_SEVERITIES
            assert f.title and f.summary and f.recommendation

    def test_missing_auth_flagged(self):
        findings, _ = run_agents(RISKY_NODES, RISKY_EDGES)
        titles = [f.title.lower() for f in findings]
        assert any("authentication" in t for t in titles)

    def test_findings_lower_their_agent_score(self):
        findings, scores = run_agents(RISKY_NODES, RISKY_EDGES)
        flagged_agents = {f.agent for f in findings}
        for agent in flagged_agents:
            assert scores[agent] < 92

    def test_empty_graph_still_scores(self):
        findings, scores = run_agents([], [])
        assert set(scores.keys()) == set(AGENT_KEYS)
        assert all(isinstance(v, int) for v in scores.values())
