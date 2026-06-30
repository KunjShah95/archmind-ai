"""Public metadata routes (no auth) — runtime config the frontend can surface."""

from fastapi import APIRouter

from app.services.llm import configured_providers

router = APIRouter(prefix="/api/meta", tags=["meta"])


@router.get("/llm")
def llm_status() -> dict:
    """Report configured LLM providers and which one is active (no secrets)."""
    providers = configured_providers()
    return {
        "llm_enabled": bool(providers),
        "active_provider": providers[0]["name"] if providers else None,
        "active_model": providers[0]["model"] if providers else None,
        "active_vision_model": providers[0].get("vision_model") if providers else None,
        "configured": providers,
        "fallback": "heuristic" if not providers else None,
    }
