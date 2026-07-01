"""AI Pair Architect Service — interactive collaborative design assistant.

Holds a dialogue sessions with the user, progressively updating a system diagram
and posing critical design trade-off questions.
"""

import json
from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json

_PAIR_SYSTEM = (
    "You are a collaborative AI Pair Architect. You design systems iteratively with the user.\n"
    "Based on the conversation history and the user's new message, update the system design.\n"
    "Respond ONLY with valid JSON inside a code block matching this schema:\n"
    "{\n"
    '  "updated_mermaid": "graph TD\\n  A[Client] --> B[API Gateway]",\n'
    '  "ai_reply": "Natural conversational response discussing changes, asking clarifying questions, and explaining reasoning.",\n'
    '  "suggested_questions": [\n'
    '    "Do we require sub-second live tracking updates?",\n'
    '    "Do we need multi-region replication for user profiles?"\n'
    '  ]\n'
    "}"
)

def _build_pair_prompt(current_mermaid: str | None, history: List[dict], new_message: str) -> str:
    history_text = "\n".join([
        f"{'User' if m.get('role') == 'user' else 'Assistant'}: {m.get('content')}"
        for m in history
    ])
    return (
        f"Current Diagram (Mermaid):\n```\n{current_mermaid or 'None (Starting new design)'}\n```\n\n"
        f"History:\n{history_text}\n"
        f"User new request: {new_message}\n\n"
        "Draft the next version of the architecture diagram using standard Mermaid flowchart notation. "
        "Explain your updates, and suggest 2-3 targeted design decisions for the next turn."
    )

def run_pair_architect_llm(current_mermaid: str | None, history: List[dict], new_message: str) -> Dict[str, Any] | None:
    prompt = _build_pair_prompt(current_mermaid, history, new_message)
    result = llm_complete(_PAIR_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def run_pair_architect_heuristic(current_mermaid: str | None, history: List[dict], new_message: str) -> Dict[str, Any]:
    # Heuristic fallback if LLM offline
    reply = (
        f"I've started designing your system based on: '{new_message}'. "
        "I've introduced a client node, an API gateway, a primary service, and a database layer. "
        "What scale of traffic are you expecting for this platform?"
    )
    
    mermaid = (
        "graph TD\n"
        "  Client[Client Application] --> Gateway[API Gateway]\n"
        "  Gateway --> Service[Core Backend Service]\n"
        "  Service --> Database[(PostgreSQL DB)]\n"
    )

    questions = [
        "Will you require a real-time caching layer like Redis?",
        "Should we decouple background jobs using a message queue like RabbitMQ or SQS?"
    ]

    return {
        "updated_mermaid": mermaid,
        "ai_reply": reply,
        "suggested_questions": questions
    }

def run_pair_architect(current_mermaid: str | None, history: List[dict], new_message: str) -> Dict[str, Any]:
    llm_res = run_pair_architect_llm(current_mermaid, history, new_message)
    if llm_res and "updated_mermaid" in llm_res:
        return llm_res
    return run_pair_architect_heuristic(current_mermaid, history, new_message)
