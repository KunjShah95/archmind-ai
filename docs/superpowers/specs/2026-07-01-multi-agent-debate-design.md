# Multi-Agent Debate: Mediator Synthesis Layer

## Overview

Add a mediator agent that synthesizes findings from all 7 existing analysis agents into a consolidated report with ranked findings, trade-off analysis, and confidence scoring.

## Architecture

```
Diagram Upload → Parse → Run 7 Agents (parallel, existing) → Mediator (new) → Store Results
```

The mediator is a pure additive layer — no changes to existing agent logic.

## Mediator Output Structure

```json
{
  "consolidated_findings": [
    {
      "finding": "...",
      "severity": "critical",
      "agents_flagged": ["Security", "Reliability"],
      "agents_disagree": ["Cost"],
      "trade_off": "Cost objects because...",
      "recommendation": "...",
      "confidence": 0.85
    }
  ],
  "final_score": 72,
  "score_by_agent": { "Security": 65, "Cost": 80 },
  "top_tensions": [
    {
      "between": ["Security", "Cost"],
      "topic": "WAF implementation",
      "resolution": "..."
    }
  ]
}
```

## Backend Changes

### New file: `backend/app/services/mediator.py`
- `run_mediator(agent_results: List[AgentResult]) -> dict`
- Constructs mediator prompt from all agent findings
- Calls `llm_complete()` with a dedicated mediator system prompt
- Returns structured JSON (or None on failure)

### Modified: `backend/app/services/pipeline.py`
- After `run_agents()` completes, call `run_mediator()`
- If mediator call fails, continue with `mediator_report = None` (no regression)
- Pass `mediator_report` to store function

### Modified: `backend/app/models.py`
- Add `mediator_report = Column(JSON, nullable=True)` to `Analysis` model

### Modified: `backend/app/schemas.py`
- Add `mediator_report: Optional[dict]` to `AnalysisResponse`

### Modified: `backend/app/routers/analyses.py`
- Include `mediator_report` in response (already included if schema is updated)

### SQL Migration
```sql
ALTER TABLE analyses ADD COLUMN mediator_report JSON;
```

## Frontend Changes

### New tab in AnalysisDetail: "Debate"
- Positioned after existing tabs (non-breaking for existing users)
- Shows:
  1. Consolidated score ring comparing final vs per-agent scores
  2. Agent agreement matrix (bar chart of score variance)
  3. Consolidated findings with trade-off badges
  4. Tension cards (expandable per disagreement)

### Components reused
- `ScoreRing` — final score display
- Existing finding card UI — with added trade-off badges
- Recharts — agreement matrix bar chart

### No new routes

## Failure Behavior
- If mediator LLM call fails: analysis succeeds, `mediator_report` is null
- Frontend hides the Debate tab when no mediator data

## Trade-offs & Rationale
- **Why not multi-round debate?** More complex, slower, higher cost. Mediator layer gives 80% of value at 20% of the effort. Multi-round can be added later.
- **Why store in DB vs compute on demand?** Mediator runs once per analysis; storing avoids re-running LLM on every page load.
- **Why not change existing agents?** Zero risk of regressions. Additive only.
