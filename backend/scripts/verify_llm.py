"""Live LLM smoke test — verifies a configured provider actually responds.

Run with at least one provider key set, e.g.:

    GROQ_API_KEY=gsk_... python scripts/verify_llm.py

Exits 0 on success, 1 if no provider configured or the call failed.
Falls through provider order; prints which provider answered. Sends no
secrets to stdout.
"""

import sys
from pathlib import Path

# Allow running from repo root or backend/.
sys.path.insert(0, str(Path(__file__).resolve().parents[1]))

from app.services.agents import run_agents  # noqa: E402
from app.services.llm import configured_providers, llm_complete  # noqa: E402

SAMPLE_NODES = [
    {"id": "n-client", "data": {"label": "Client"}},
    {"id": "n-api", "data": {"label": "API Gateway"}},
    {"id": "n-db", "data": {"label": "Postgres"}},
]
SAMPLE_EDGES = [
    {"id": "e0", "source": "n-client", "target": "n-api"},
    {"id": "e1", "source": "n-api", "target": "n-db"},
]


def main() -> int:
    providers = configured_providers()
    if not providers:
        print("No LLM provider configured. Set a key (e.g. GROQ_API_KEY) and retry.")
        print("Engine would fall back to the heuristic analyzer.")
        return 1

    print("Configured providers (priority order):")
    for p in providers:
        print(f"  - {p['name']}  model={p['model']}")

    print("\n[1/2] Raw completion test...")
    reply = llm_complete(
        "You are a terse assistant.",
        "Reply with exactly the word: OK",
    )
    if not reply:
        print("  FAILED — no provider returned a completion.")
        return 1
    print(f"  OK — got {len(reply)} chars. First line: {reply.strip().splitlines()[0][:80]!r}")

    print("\n[2/2] Agent analysis test (run_agents over sample graph)...")
    findings, scores = run_agents(SAMPLE_NODES, SAMPLE_EDGES)
    print(f"  findings={len(findings)}  agents_scored={len(scores)}")
    if findings:
        f = findings[0]
        print(f"  sample finding: [{f.agent}/{f.severity}] {f.title}")
    print("\nLive LLM path verified.")
    return 0


if __name__ == "__main__":
    raise SystemExit(main())
