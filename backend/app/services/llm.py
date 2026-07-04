"""Free/open-source LLM provider abstraction.

Supports (all free tiers): Ollama (local), Groq, NVIDIA NIM, OpenRouter,
Google Gemini, HuggingFace Inference API, and any OpenAI-compatible endpoint —
with a heuristic fallback when no provider is configured.

Provider priority is controlled by LLM_PROVIDER_ORDER (comma-separated names);
the first configured provider that returns a response wins, others are fallbacks.
"""

import hashlib
import json
import logging
import os
import urllib.request
import urllib.error
from dataclasses import dataclass
from typing import Callable

# ---------------------------------------------------------------------------
# Optional Redis cache — only activated when REDIS_URL env var is set and the
# redis library is installed.  Import failures are silenced; the service
# degrades gracefully to uncached mode.
# ---------------------------------------------------------------------------
try:
    import redis as _redis_module  # type: ignore[import]
    _REDIS_AVAILABLE = True
except ImportError:
    _redis_module = None  # type: ignore[assignment]
    _REDIS_AVAILABLE = False

# Lazily initialised on first use; kept at module level so the connection is
# reused across calls without re-connecting every request.
_redis_client = None

_logger = logging.getLogger(__name__)


def _get_redis():
    """Return a live Redis client, or None if unavailable / not configured.

    Initialised lazily on first call so import-time side-effects are avoided.
    """
    global _redis_client
    if not _REDIS_AVAILABLE:
        return None
    redis_url = os.environ.get("REDIS_URL")
    if not redis_url:
        return None
    if _redis_client is None:
        _redis_client = _redis_module.from_url(redis_url, decode_responses=True)
    return _redis_client


def _cache_key(provider_name: str, model: str, system: str, prompt: str) -> str:
    """Return SHA-256 hex digest of the four-part cache identity."""
    raw = f"{provider_name}:{model}:{system}:{prompt}"
    return hashlib.sha256(raw.encode()).hexdigest()


# Groq (and some others) sit behind Cloudflare, which blocks urllib's default
# "Python-urllib/x.y" User-Agent with HTTP 403 (Cloudflare error 1010). Send a
# normal UA on every request.
_USER_AGENT = "archmind-ai/1.0"


@dataclass
class ProviderConfig:
    name: str
    base_url: str | None = None
    api_key: str | None = None
    model: str | None = None
    vision_model: str | None = None  # multimodal model for image inputs


# Default free vision-capable model per provider (override via <PROVIDER>_VISION_MODEL).
DEFAULT_VISION_MODELS = {
    "groq": "meta-llama/llama-4-scout-17b-16e-instruct",
    "nvidia": "meta/llama-4-scout-17b-16e-instruct",
    "openrouter": "meta-llama/llama-3.2-11b-vision-instruct:free",
    "gemini": "gemini-2.0-flash",
    "ollama": "llama3.2-vision",
    "openai-compatible": "gpt-4o-mini",
}


# Default fallback order — overridable via LLM_PROVIDER_ORDER env var.
DEFAULT_PROVIDER_ORDER = [
    "groq", "nvidia", "openrouter", "gemini",
    "openai-compatible", "ollama", "huggingface",
]


def _provider_order() -> list[str]:
    raw = os.environ.get("LLM_PROVIDER_ORDER", "")
    order = [p.strip().lower() for p in raw.split(",") if p.strip()]
    if not order:
        return DEFAULT_PROVIDER_ORDER
    # Append any defaults the user didn't list so they still act as fallbacks.
    for name in DEFAULT_PROVIDER_ORDER:
        if name not in order:
            order.append(name)
    return order


def _discover_providers() -> dict[str, ProviderConfig]:
    """Build a name -> config map of every provider the env has credentials for."""
    found: dict[str, ProviderConfig] = {}

    if os.environ.get("OLLAMA_BASE_URL"):
        found["ollama"] = ProviderConfig(
            name="ollama",
            base_url=os.environ["OLLAMA_BASE_URL"].rstrip("/"),
            model=os.environ.get("OLLAMA_MODEL", "qwen2.5:7b"),
        )

    if os.environ.get("GROQ_API_KEY"):
        found["groq"] = ProviderConfig(
            name="groq",
            base_url="https://api.groq.com/openai/v1",
            api_key=os.environ["GROQ_API_KEY"],
            model=os.environ.get("GROQ_MODEL", "llama-3.3-70b-versatile"),
        )

    if os.environ.get("NVIDIA_API_KEY"):
        found["nvidia"] = ProviderConfig(
            name="nvidia",
            base_url=os.environ.get("NVIDIA_BASE_URL", "https://integrate.api.nvidia.com/v1").rstrip("/"),
            api_key=os.environ["NVIDIA_API_KEY"],
            model=os.environ.get("NVIDIA_MODEL", "meta/llama-3.3-70b-instruct"),
        )

    if os.environ.get("OPENROUTER_API_KEY"):
        found["openrouter"] = ProviderConfig(
            name="openrouter",
            base_url="https://openrouter.ai/api/v1",
            api_key=os.environ["OPENROUTER_API_KEY"],
            model=os.environ.get("OPENROUTER_MODEL", "meta-llama/llama-3.3-70b-instruct:free"),
        )

    if os.environ.get("GEMINI_API_KEY"):
        found["gemini"] = ProviderConfig(
            name="gemini",
            base_url=os.environ.get(
                "GEMINI_BASE_URL", "https://generativelanguage.googleapis.com/v1beta"
            ).rstrip("/"),
            api_key=os.environ["GEMINI_API_KEY"],
            model=os.environ.get("GEMINI_MODEL", "gemini-2.0-flash"),
        )

    if os.environ.get("HF_API_KEY"):
        found["huggingface"] = ProviderConfig(
            name="huggingface",
            base_url="https://api-inference.huggingface.co/models",
            api_key=os.environ["HF_API_KEY"],
            model=os.environ.get("HF_MODEL", "mistralai/Mixtral-8x7B-Instruct-v0.1"),
        )

    if os.environ.get("OPENAI_API_KEY") and os.environ.get("OPENAI_BASE_URL", "").startswith("http"):
        found["openai-compatible"] = ProviderConfig(
            name="openai-compatible",
            base_url=os.environ["OPENAI_BASE_URL"].rstrip("/"),
            api_key=os.environ["OPENAI_API_KEY"],
            model=os.environ.get("OPENAI_MODEL", "gpt-4o-mini"),
        )

    # Attach a vision model to each provider (env override, else free default).
    for name, cfg in found.items():
        env_key = f"{name.upper().replace('-', '_')}_VISION_MODEL"
        cfg.vision_model = os.environ.get(env_key, DEFAULT_VISION_MODELS.get(name))

    return found


def _init_providers() -> list[ProviderConfig]:
    """Discover available free providers from environment, ordered by priority."""
    found = _discover_providers()
    return [found[name] for name in _provider_order() if name in found]


def configured_providers() -> list[dict[str, str]]:
    """Public-safe provider summary for status endpoints (never exposes keys)."""
    return [
        {"name": p.name, "model": p.model or "", "vision_model": p.vision_model or ""}
        for p in _init_providers()
    ]


def _call_ollama(p: ProviderConfig, prompt: str, system: str) -> str | None:
    try:
        body = json.dumps({
            "model": p.model or "qwen2.5:7b",
            "prompt": prompt,
            "system": system,
            "stream": False,
            "options": {"temperature": 0.3, "num_predict": 2048},
        }).encode()
        req = urllib.request.Request(
            f"{p.base_url}/api/generate",
            data=body,
            headers={"Content-Type": "application/json", "User-Agent": _USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            return data.get("response")
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "ollama", "error": str(e)})
        return None


def _call_openai_compat(p: ProviderConfig, prompt: str, system: str) -> str | None:
    try:
        body = json.dumps({
            "model": p.model or "gpt-4o-mini",
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": prompt},
            ],
            "temperature": 0.3,
            "max_tokens": 2048,
        }).encode()
        headers = {"Content-Type": "application/json", "User-Agent": _USER_AGENT}
        if p.api_key:
            headers["Authorization"] = f"Bearer {p.api_key}"
        req = urllib.request.Request(
            f"{p.base_url}/chat/completions",
            data=body,
            headers=headers,
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            return data.get("choices", [{}])[0].get("message", {}).get("content")
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "openai_compat", "error": str(e)})
        return None


def _call_huggingface(p: ProviderConfig, prompt: str, system: str) -> str | None:
    try:
        full_prompt = f"{system}\n\n{prompt}"
        body = json.dumps({
            "inputs": full_prompt,
            "parameters": {"temperature": 0.3, "max_new_tokens": 1024},
        }).encode()
        req = urllib.request.Request(
            f"{p.base_url}/{p.model}",
            data=body,
            headers={
                "Authorization": f"Bearer {p.api_key}",
                "Content-Type": "application/json",
                "User-Agent": _USER_AGENT,
            },
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            if isinstance(data, list) and len(data) > 0:
                return data[0].get("generated_text", "")
            return None
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "huggingface", "error": str(e)})
        return None


def _call_gemini(p: ProviderConfig, prompt: str, system: str) -> str | None:
    try:
        body = json.dumps({
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [{"text": prompt}]}],
            "generationConfig": {"temperature": 0.3, "maxOutputTokens": 2048},
        }).encode()
        url = f"{p.base_url}/models/{p.model}:generateContent?key={p.api_key}"
        req = urllib.request.Request(
            url, data=body,
            headers={"Content-Type": "application/json", "User-Agent": _USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=60) as resp:
            data = json.loads(resp.read().decode())
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(part.get("text", "") for part in parts) or None
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "gemini", "error": str(e)})
        return None


# ── Vision (multimodal) callers — accept a base64 image alongside the prompt ──

def _call_openai_compat_vision(p: ProviderConfig, prompt: str, system: str, image_b64: str, mime: str) -> str | None:
    try:
        body = json.dumps({
            "model": p.vision_model or p.model,
            "messages": [
                {"role": "system", "content": system},
                {"role": "user", "content": [
                    {"type": "text", "text": prompt},
                    {"type": "image_url", "image_url": {"url": f"data:{mime};base64,{image_b64}"}},
                ]},
            ],
            "temperature": 0.2,
            "max_tokens": 2048,
        }).encode()
        headers = {"Content-Type": "application/json", "User-Agent": _USER_AGENT}
        if p.api_key:
            headers["Authorization"] = f"Bearer {p.api_key}"
        req = urllib.request.Request(
            f"{p.base_url}/chat/completions", data=body, headers=headers, method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
            return data.get("choices", [{}])[0].get("message", {}).get("content")
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "openai_compat_vision", "error": str(e)})
        return None


def _call_gemini_vision(p: ProviderConfig, prompt: str, system: str, image_b64: str, mime: str) -> str | None:
    try:
        body = json.dumps({
            "systemInstruction": {"parts": [{"text": system}]},
            "contents": [{"role": "user", "parts": [
                {"inline_data": {"mime_type": mime, "data": image_b64}},
                {"text": prompt},
            ]}],
            "generationConfig": {"temperature": 0.2, "maxOutputTokens": 2048},
        }).encode()
        url = f"{p.base_url}/models/{p.vision_model or p.model}:generateContent?key={p.api_key}"
        req = urllib.request.Request(
            url, data=body,
            headers={"Content-Type": "application/json", "User-Agent": _USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=90) as resp:
            data = json.loads(resp.read().decode())
            candidates = data.get("candidates", [])
            if not candidates:
                return None
            parts = candidates[0].get("content", {}).get("parts", [])
            return "".join(part.get("text", "") for part in parts) or None
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "gemini_vision", "error": str(e)})
        return None


def _call_ollama_vision(p: ProviderConfig, prompt: str, system: str, image_b64: str, mime: str) -> str | None:
    try:
        body = json.dumps({
            "model": p.vision_model or p.model,
            "prompt": prompt,
            "system": system,
            "images": [image_b64],
            "stream": False,
            "options": {"temperature": 0.2, "num_predict": 2048},
        }).encode()
        req = urllib.request.Request(
            f"{p.base_url}/api/generate", data=body,
            headers={"Content-Type": "application/json", "User-Agent": _USER_AGENT},
            method="POST",
        )
        with urllib.request.urlopen(req, timeout=120) as resp:
            data = json.loads(resp.read().decode())
            return data.get("response")
    except Exception as e:
        _logger.warning("LLM call failed", extra={"provider": "ollama_vision", "error": str(e)})
        return None


# OpenAI-compatible providers (Groq, NVIDIA NIM, OpenRouter, generic) share one caller.
DISPATCH: dict[str, Callable[[ProviderConfig, str, str], str | None]] = {
    "ollama": _call_ollama,
    "groq": _call_openai_compat,
    "nvidia": _call_openai_compat,
    "openrouter": _call_openai_compat,
    "gemini": _call_gemini,
    "openai-compatible": _call_openai_compat,
    "huggingface": _call_huggingface,
}

# Vision-capable providers only (HuggingFace inference API path omitted).
VISION_DISPATCH: dict[str, Callable[[ProviderConfig, str, str, str, str], str | None]] = {
    "groq": _call_openai_compat_vision,
    "nvidia": _call_openai_compat_vision,
    "openrouter": _call_openai_compat_vision,
    "openai-compatible": _call_openai_compat_vision,
    "gemini": _call_gemini_vision,
    "ollama": _call_ollama_vision,
}


def _extract_json(text: str) -> dict | None:
    """Strip markdown fences / prose and parse the first JSON object."""
    cleaned = text.strip()
    if cleaned.startswith("```json"):
        cleaned = cleaned[7:]
    if cleaned.startswith("```"):
        cleaned = cleaned[3:]
    if cleaned.endswith("```"):
        cleaned = cleaned[:-3]
    cleaned = cleaned.strip()
    try:
        return json.loads(cleaned)
    except json.JSONDecodeError:
        # Fall back to the outermost {...} span if the model added stray text.
        start, end = cleaned.find("{"), cleaned.rfind("}")
        if start != -1 and end > start:
            try:
                return json.loads(cleaned[start:end + 1])
            except json.JSONDecodeError:
                return None
        return None


def llm_complete(system: str, prompt: str) -> str | None:
    """Text completion with provider fallback.

    Walks providers in priority order. Any failure (rate limit, timeout, error)
    yields None from the caller and falls through to the next provider, so a key
    hitting its limit hands off to the next configured provider automatically.

    Responses are cached in Redis (TTL 24 h) when REDIS_URL is set and the
    redis library is installed.  Cache errors are logged at WARNING level and
    the call proceeds without caching — no exceptions are surfaced to callers.
    """
    providers = _init_providers()
    if not providers:
        return None

    # Build the cache key from the first provider in priority order (stable
    # representative for this configuration + prompt pair).
    first = providers[0]
    key = _cache_key(first.name, first.model or "", system, prompt)

    rc = _get_redis()
    if rc is not None:
        try:
            cached = rc.get(key)
            if cached is not None:
                _logger.debug("llm_cache_hit", extra={"key_prefix": key[:16]})
                return cached
        except Exception as exc:
            _logger.warning("llm_cache_error", extra={"error": str(exc)})
            rc = None  # disable cache for the remainder of this call

    for p in providers:
        fn = DISPATCH.get(p.name)
        if fn is None:
            continue
        result = fn(p, prompt, system)
        if result is not None:
            if rc is not None:
                try:
                    rc.set(key, result, ex=86400)
                except Exception as exc:
                    _logger.warning("llm_cache_error", extra={"error": str(exc)})
            return result
    return None


def llm_vision_complete(system: str, prompt: str, image_bytes: bytes, mime: str = "image/png") -> str | None:
    """Multimodal completion with the same provider-fallback semantics as text."""
    import base64

    providers = _init_providers()
    if not providers:
        return None
    image_b64 = base64.b64encode(image_bytes).decode()
    for p in providers:
        if not p.vision_model:
            continue
        fn = VISION_DISPATCH.get(p.name)
        if fn is None:
            continue
        result = fn(p, prompt, system, image_b64, mime)
        if result is not None:
            return result
    return None


_VISION_EXTRACT_SYSTEM = (
    "You are an architecture diagram parser. Read the diagram image and extract its "
    "components (nodes) and the connections between them (edges). Be precise; use the "
    "labels shown in the image."
)


def llm_vision_extract_graph(image_bytes: bytes, mime: str = "image/png") -> tuple[list[dict], list[dict]] | None:
    """Extract architecture nodes/edges from a diagram image via a vision model.

    Returns graph in the pipeline's node/edge shape, or None if no vision provider
    answered (caller then falls back to the sample graph).
    """
    prompt = (
        "Extract the architecture as JSON only, no prose:\n"
        '{"nodes": [{"id": "<short_id>", "label": "<component name>"}], '
        '"edges": [{"source": "<node id>", "target": "<node id>"}]}\n'
        "Use concise lowercase ids derived from labels (e.g. 'api', 'db'). "
        "Only include edges between ids you listed in nodes."
    )
    result = llm_vision_complete(_VISION_EXTRACT_SYSTEM, prompt, image_bytes, mime)
    if not result:
        return None
    data = _extract_json(result)
    if not data:
        return None

    raw_nodes = data.get("nodes") or []
    raw_edges = data.get("edges") or []
    if not raw_nodes:
        return None

    nodes: list[dict] = []
    seen_ids: set[str] = set()
    for i, n in enumerate(raw_nodes):
        rid = str(n.get("id") or n.get("label") or f"node{i}").strip()
        if not rid or rid in seen_ids:
            continue
        seen_ids.add(rid)
        nodes.append({
            "id": f"n-{rid}",
            "data": {"label": str(n.get("label") or rid).strip()},
            "position": {"x": 40 + (len(nodes) % 3) * 200, "y": 60 + (len(nodes) // 3) * 140},
        })

    edges: list[dict] = []
    for e in raw_edges:
        src, tgt = str(e.get("source", "")).strip(), str(e.get("target", "")).strip()
        if src in seen_ids and tgt in seen_ids:
            edges.append({"id": f"e{len(edges)}", "source": f"n-{src}", "target": f"n-{tgt}"})

    return nodes, edges


AGENT_SYSTEM_PROMPTS: dict[str, str] = {
    "scalability": (
        "You are a systems scalability expert. Analyze the architecture diagram and identify "
        "scalability bottlenecks, horizontal scaling opportunities, and capacity risks. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "security": (
        "You are a security architect. Audit the architecture for authentication, authorization, "
        "network exposure, secret management, and threat surface risks. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "reliability": (
        "You are a Site Reliability Engineer. Evaluate failure modes, redundancy, SLAs/SLOs, "
        "disaster recovery, and retry/backoff patterns in the architecture. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "performance": (
        "You are a performance engineer. Analyze latency, caching strategy, query patterns, "
        "hot paths, and throughput bottlenecks in the diagram. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "cost": (
        "You are a FinOps specialist. Estimate infrastructure costs, identify idle waste, "
        "right-sizing opportunities, and suggest savings. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "maintainability": (
        "You are a software architecture quality analyst. Review modularity, coupling, cohesion, "
        "documentation ownership, and developer experience of the architecture. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
    "observability": (
        "You are an observability expert. Analyze logging, metrics, tracing, alerting, "
        "and monitoring coverage across the architecture. "
        "Return findings as JSON array with: agent (string), severity (low|medium|high|critical), "
        "title, summary, recommendation, node_id (or null). Score 0-100."
    ),
}


def llm_agent_analyze(agent_key: str, node_labels: list[str], edge_descriptions: list[str], node_count: int, edge_count: int) -> tuple[list[dict], int] | None:
    system = AGENT_SYSTEM_PROMPTS.get(agent_key, "")
    if not system:
        return None

    prompt = (
        f"Analyze this architecture diagram:\n"
        f"Components: {', '.join(node_labels) if node_labels else 'none listed'}\n"
        f"Connections: {'; '.join(edge_descriptions[:20]) if edge_descriptions else 'none listed'}\n"
        f"Total nodes: {node_count}, Total edges: {edge_count}\n\n"
        f"Respond ONLY with valid JSON: {{\"findings\": [...], \"score\": <int 0-100>}}\n"
        f"Each finding: {{\"agent\": \"{agent_key}\", \"severity\": \"low|medium|high|critical\", "
        f"\"title\": \"...\", \"summary\": \"...\", \"recommendation\": \"...\", \"node_id\": null}}"
    )

    result = llm_complete(system, prompt)
    if not result:
        return None

    data = _extract_json(result)
    if data is None:
        return None
    return data.get("findings", []), data.get("score", 75)
