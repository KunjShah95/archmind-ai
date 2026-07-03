# Multi-Agent Debate Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Add a mediator agent that synthesizes all 7 agent findings into a consolidated report with trade-off analysis, tension detection, and confidence scoring.

**Architecture:** After all 7 agents run, a new mediator service receives findings + scores per agent, calls the LLM with a synthesis prompt, and stores structured output as a JSON column on the analysis. Frontend shows a new Debate tab with consolidated findings, agreement matrix, and tension cards.

**Tech Stack:** Python/FastAPI, SQLAlchemy, React/TypeScript, Recharts

---

### Task 1: Create mediator service (`mediator.py`)

**Files:**
- Create: `backend/app/services/mediator.py`
- Modify: `backend/app/services/agents.py:13-16` (export AGENT_KEYS, AGENT_NAMES)
- Modify: `backend/app/services/llm.py:528` (ensure `_extract_json` is importable)

- [ ] **Step 1: Create mediator.py with mediator prompt and run_mediator function**

```python
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

    # Validate expected fields
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
```

- [ ] **Step 2: Run tests to verify import works**

Run: `python -c "from app.services.mediator import run_mediator; print('import OK')"`
Workdir: `backend`
Expected: prints "import OK" (may need `pip install -r requirements.txt` first)

- [ ] **Step 3: Commit**

```bash
git add backend/app/services/mediator.py
git commit -m "feat: add mediator service for multi-agent debate"
```

---

### Task 2: Update Analysis model and schema

**Files:**
- Modify: `backend/app/models.py:72-76`
- Modify: `backend/app/schemas.py:73-80`

- [ ] **Step 1: Add mediator_report column to Analysis model**

```python
# After line 73 (after generated_artifacts line), add:
    mediator_report: Mapped[dict | None] = mapped_column(JSON, nullable=True)
```

- [ ] **Step 2: Add mediator_report to AnalysisDetail schema**

```python
# After line 80 (after generated_artifacts line), add:
    mediator_report: dict[str, Any] | None = None
```

- [ ] **Step 3: Run tests to confirm models/schemas still valid**

Run: `pytest tests/ -v`
Workdir: `backend`
Expected: all existing tests pass

- [ ] **Step 4: Commit**

```bash
git add backend/app/models.py backend/app/schemas.py
git commit -m "feat: add mediator_report column to Analysis model and schema"
```

---

### Task 3: Integrate mediator into pipeline

**Files:**
- Modify: `backend/app/services/pipeline.py:11` (import mediator)
- Modify: `backend/app/services/pipeline.py:106-127` (call mediator after agents)

- [ ] **Step 1: Import mediator in pipeline.py**

```python
# After line 11 (from app.services.diagram ...), add:
from app.services.mediator import run_mediator
```

- [ ] **Step 2: Call mediator after agent findings are computed**

In `pipeline.py`, after line 106 (`findings_data, scores = run_agents(nodes, edges)`), add:

```python
    # Run mediator to synthesise agent findings
    mediator_report = run_mediator(nodes, edges, findings_data, scores)
```

Then after line 125 (`analysis.scores = scores`), add:

```python
    analysis.mediator_report = mediator_report
```

The full section (lines ~106-127) becomes:

```python
    findings_data, scores = run_agents(nodes, edges)

    # Run mediator to synthesise agent findings
    mediator_report = run_mediator(nodes, edges, findings_data, scores)

    # Clear old findings
    db.query(Finding).filter(Finding.analysis_id == analysis_id).delete()

    for f in findings_data:
        db.add(Finding(
            analysis_id=analysis_id,
            agent=f.agent,
            severity=f.severity,
            title=f.title,
            summary=f.summary,
            recommendation=f.recommendation,
            node_id=f.node_id,
        ))

    analysis.diagram_type = diagram_type
    analysis.diagram_nodes = nodes
    analysis.diagram_edges = edges
    analysis.scores = scores
    analysis.mediator_report = mediator_report
    analysis.status = "ready"
    db.commit()
```

- [ ] **Step 3: Run pipeline tests**

Run: `pytest tests/test_pipeline.py -v`
Workdir: `backend`
Expected: all tests pass (mediator returns None because no LLM keys set in tests, so `mediator_report` will be None — this is the correct graceful fallback)

- [ ] **Step 4: Commit**

```bash
git add backend/app/services/pipeline.py
git commit -m "feat: integrate mediator into analysis pipeline"
```

---

### Task 4: Expose mediator_report in API

**Files:**
- Modify: `backend/app/routers/analyses.py:86-92` (include mediator_report in detail response)

- [ ] **Step 1: Include mediator_report in the analysis detail response**

After line 91 (`findings=[FindingOut.model_validate(f) for f in a.findings]`), add:

```python
        mediator_report=a.mediator_report,
```

The full `get_analysis` return becomes:

```python
    return AnalysisDetail(
        **summary.model_dump(),
        source_type=a.source_type,
        diagram_nodes=a.diagram_nodes or [],
        diagram_edges=a.diagram_edges or [],
        findings=[FindingOut.model_validate(f) for f in a.findings],
        mediator_report=a.mediator_report,
    )
```

- [ ] **Step 2: Run tests**

Run: `pytest tests/ -v`
Workdir: `backend`
Expected: all tests pass

- [ ] **Step 3: Commit**

```bash
git add backend/app/routers/analyses.py
git commit -m "feat: expose mediator_report in analysis API response"
```

---

### Task 5: Write backend tests for mediator

**Files:**
- Create: `backend/tests/test_mediator.py`

- [ ] **Step 1: Create test file for mediator**

```python
"""Tests for the mediator service (no LLM key required — tests graceful fallback)."""

from app.services.mediator import run_mediator, _build_mediator_prompt, MEDIATOR_SYSTEM_PROMPT
from app.services.agents import AGENT_KEYS, AgentFinding


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
        assert result is None  # No LLM keys in test env

    def test_handles_empty_findings_gracefully(self):
        result = run_mediator(SAMPLE_NODES, SAMPLE_EDGES, [],
                              {k: 92 for k in AGENT_KEYS})
        assert result is None  # No LLM keys, graceful fallback

    def test_handles_empty_graph_gracefully(self):
        result = run_mediator([], [], build_sample_findings(),
                              {"security": 60, "cost": 85})
        assert result is None  # No LLM keys, graceful fallback
```

- [ ] **Step 2: Run the tests**

Run: `pytest tests/test_mediator.py -v`
Workdir: `backend`
Expected: all 6 tests pass (all test graceful None return since no LLM keys)

- [ ] **Step 3: Commit**

```bash
git add backend/tests/test_mediator.py
git commit -m "test: add mediator service tests"
```

---

### Task 6: Frontend — Create Debate tab in AnalysisDetail

**Files:**
- Read: `src/pages/AnalysisDetail.tsx`
- Read: `src/components/ScoreRing.tsx`
- Modify: `src/pages/AnalysisDetail.tsx`

- [ ] **Step 1: Read current AnalysisDetail to understand tab structure**

Read the file first to find existing tab rendering.

- [ ] **Step 2: Add Debate tab alongside existing tabs**

Find where tabs are rendered (likely a flex row of buttons). Add a new "Debate" tab after the existing tabs. When active, render the `MediatorReport` component.

```tsx
// Find where tabs are defined, add:
const TABS = ['diagram', 'findings', 'scores', 'debate', 'chat'] as const;
// ...
{activeTab === 'debate' && analysis?.mediator_report && (
  <MediatorReport report={analysis.mediator_report} agentScores={analysis.scores} />
)}
{activeTab === 'debate' && !analysis?.mediator_report && (
  <div className="text-center py-12 text-muted-foreground">
    <p>Debate analysis is not available for this analysis.</p>
    <p className="text-sm mt-1">The mediator requires an LLM provider to be configured.</p>
  </div>
)}
```

- [ ] **Step 3: Create MediatorReport component**

```tsx
// src/components/MediatorReport.tsx
import { ScoreRing } from './ScoreRing';
import { Card, CardContent, CardHeader, CardTitle } from './ui/card';
import { Badge } from './ui/badge';
import { AlertTriangle, CheckCircle, Info } from 'lucide-react';

interface MediatorReportProps {
  report: {
    consolidated_findings: Array<{
      finding: string;
      severity: string;
      agents_flagged: string[];
      agents_disagree: string[] | null;
      trade_off: string | null;
      recommendation: string;
      confidence: number;
    }>;
    final_score: number;
    score_by_agent: Record<string, number>;
    top_tensions: Array<{
      between: string[];
      topic: string;
      resolution: string;
    }>;
  };
  agentScores: Record<string, number>;
}

const severityConfig = {
  critical: { icon: AlertTriangle, class: 'text-red-500 border-red-200 bg-red-50 dark:bg-red-950/20' },
  high: { icon: AlertTriangle, class: 'text-orange-500 border-orange-200 bg-orange-50 dark:bg-orange-950/20' },
  medium: { icon: Info, class: 'text-yellow-500 border-yellow-200 bg-yellow-50 dark:bg-yellow-950/20' },
  low: { icon: CheckCircle, class: 'text-green-500 border-green-200 bg-green-50 dark:bg-green-950/20' },
};

export function MediatorReport({ report, agentScores }: MediatorReportProps) {
  return (
    <div className="space-y-6">
      {/* Header with consolidated score */}
      <div className="flex items-center gap-6 p-4 rounded-lg border bg-card">
        <ScoreRing value={report.final_score} size={80} strokeWidth={6} />
        <div>
          <h3 className="text-lg font-semibold">Consolidated Architecture Score</h3>
          <p className="text-sm text-muted-foreground">
            Mediated from {Object.keys(report.score_by_agent).length} specialist agents
          </p>
        </div>
      </div>

      {/* Agent score comparison */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Agent Score Comparison</CardTitle>
        </CardHeader>
        <CardContent>
          <div className="grid grid-cols-2 sm:grid-cols-3 md:grid-cols-4 gap-2">
            {Object.entries(report.score_by_agent).map(([agent, score]) => (
              <div key={agent} className="flex items-center gap-2 p-2 rounded border">
                <ScoreRing value={score} size={40} strokeWidth={4} />
                <div className="text-xs">
                  <p className="font-medium capitalize">{agent}</p>
                  <p className="text-muted-foreground">{score}/100</p>
                </div>
              </div>
            ))}
          </div>
        </CardContent>
      </Card>

      {/* Consolidated findings */}
      <Card>
        <CardHeader>
          <CardTitle className="text-base">Consolidated Findings (ranked)</CardTitle>
        </CardHeader>
        <CardContent className="space-y-4">
          {report.consolidated_findings.map((f, i) => {
            const config = severityConfig[f.severity] || severityConfig.medium;
            const Icon = config.icon;
            return (
              <div key={i} className={`p-3 rounded-lg border ${config.class}`}>
                <div className="flex items-start gap-3">
                  <Icon className="w-5 h-5 mt-0.5 shrink-0" />
                  <div className="min-w-0 flex-1">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <span className="font-medium text-sm">{f.finding}</span>
                      <Badge variant="outline" className="text-xs capitalize">{f.severity}</Badge>
                      <Badge variant="secondary" className="text-xs">
                        {(f.confidence * 100).toFixed(0)}% confidence
                      </Badge>
                    </div>
                    <div className="flex flex-wrap gap-1 mb-2">
                      {f.agents_flagged.map(a => (
                        <Badge key={a} variant="outline" className="text-xs capitalize">
                          {a}
                        </Badge>
                      ))}
                      {f.agents_disagree?.map(a => (
                        <Badge key={a} variant="destructive" className="text-xs capitalize">
                          {a} disagrees
                        </Badge>
                      ))}
                    </div>
                    {f.trade_off && (
                      <p className="text-xs font-medium text-amber-600 dark:text-amber-400 mb-1">
                        Trade-off: {f.trade_off}
                      </p>
                    )}
                    <p className="text-xs text-muted-foreground">{f.recommendation}</p>
                  </div>
                </div>
              </div>
            );
          })}
        </CardContent>
      </Card>

      {/* Tensions */}
      {report.top_tensions.length > 0 && (
        <Card>
          <CardHeader>
            <CardTitle className="text-base">Agent Tensions</CardTitle>
            <p className="text-sm text-muted-foreground">
              Areas where agents meaningfully disagree
            </p>
          </CardHeader>
          <CardContent className="space-y-3">
            {report.top_tensions.map((t, i) => (
              <div key={i} className="p-3 rounded-lg border bg-muted/30">
                <div className="flex flex-wrap gap-1 mb-1">
                  {t.between.map(a => (
                    <Badge key={a} variant="outline" className="text-xs capitalize">{a}</Badge>
                  ))}
                  <span className="text-xs text-muted-foreground self-center">disagree on</span>
                </div>
                <p className="font-medium text-sm mb-1">{t.topic}</p>
                <p className="text-xs text-muted-foreground">{t.resolution}</p>
              </div>
            ))}
          </CardContent>
        </Card>
      )}
    </div>
  );
}
```

- [ ] **Step 4: Run frontend typecheck**

Run: `npx tsc --noEmit`
Workdir: `.`
Expected: no type errors

- [ ] **Step 5: Commit**

```bash
git add src/pages/AnalysisDetail.tsx src/components/MediatorReport.tsx
git commit -m "feat: add Debate tab with MediatorReport component"
```
