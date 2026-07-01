"""Architecture Redesign Service — generates optimized architecture variants.

Supports strategies: cost_optimized, performance_optimized, high_availability,
enterprise_scale, startup_mvp, multi_region.

Each produces a transformed architecture with change summary and trade-off analysis.
"""

import json
from typing import Any

from app.services.llm import llm_complete, _extract_json
from app.services.diagram import node_labels, has_component, _layout


STRATEGIES = {
    "cost_optimized": {
        "name": "Cost Optimized",
        "description": "Minimize infrastructure spend while maintaining acceptable performance",
        "icon": "DollarSign",
        "accent": "from-emerald-500 to-teal-400",
    },
    "performance_optimized": {
        "name": "Performance Optimized",
        "description": "Maximize throughput and minimize latency at any cost",
        "icon": "Gauge",
        "accent": "from-violet-500 to-indigo-400",
    },
    "high_availability": {
        "name": "High Availability",
        "description": "99.99% uptime with multi-AZ redundancy and automatic failover",
        "icon": "HeartPulse",
        "accent": "from-rose-500 to-orange-400",
    },
    "enterprise_scale": {
        "name": "Enterprise Scale",
        "description": "Handle 100M+ users with enterprise security and compliance",
        "icon": "Building",
        "accent": "from-sky-500 to-cyan-400",
    },
    "startup_mvp": {
        "name": "Startup MVP",
        "description": "Minimal viable architecture — ship fast, iterate later",
        "icon": "Rocket",
        "accent": "from-amber-500 to-yellow-400",
    },
    "multi_region": {
        "name": "Multi-Region",
        "description": "Global deployment across multiple regions with data sovereignty",
        "icon": "Globe",
        "accent": "from-fuchsia-500 to-pink-400",
    },
}


_REDESIGN_SYSTEM = (
    "You are a solutions architect specializing in architecture optimization. "
    "Given an existing architecture and an optimization strategy, produce a redesigned architecture. "
    "Respond ONLY with valid JSON:\n"
    "{\n"
    '  "nodes": [{"id": "<short_id>", "label": "<component name>"}],\n'
    '  "edges": [{"source": "<node id>", "target": "<node id>"}],\n'
    '  "changes": [{"type": "added|removed|modified", "component": "...", "description": "..."}],\n'
    '  "trade_offs": [{"aspect": "...", "impact": "positive|negative|neutral", "description": "..."}],\n'
    '  "summary": "One paragraph explaining the key changes"\n'
    "}"
)


def _redesign_prompt(
    labels: list[str],
    edge_descriptions: list[str],
    strategy: str,
) -> str:
    strat_info = STRATEGIES.get(strategy, {})
    return (
        f"Current architecture components: {', '.join(labels)}\n"
        f"Current connections: {'; '.join(edge_descriptions[:20])}\n\n"
        f"Optimization strategy: {strat_info.get('name', strategy)}\n"
        f"Goal: {strat_info.get('description', strategy)}\n\n"
        "Redesign the architecture to optimize for this strategy. "
        "Add, remove, or modify components as needed. "
        "Explain every change and its trade-off."
    )


def _edge_descriptions(nodes: list[dict], edges: list[dict]) -> list[str]:
    labels = node_labels(nodes)
    return [
        f"{labels.get(e.get('source', ''), '?')} -> {labels.get(e.get('target', ''), '?')}"
        for e in edges
    ]


def redesign_llm(
    nodes: list[dict],
    edges: list[dict],
    strategy: str,
) -> dict[str, Any] | None:
    """LLM-based architecture redesign."""
    labels = list(node_labels(nodes).values())
    edge_desc = _edge_descriptions(nodes, edges)
    prompt = _redesign_prompt(labels, edge_desc, strategy)
    result = llm_complete(_REDESIGN_SYSTEM, prompt)
    if not result:
        return None
    data = _extract_json(result)
    if not data or "nodes" not in data:
        return None
    return data


def _build_redesigned_graph(raw: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """Convert LLM output into React Flow node/edge format."""
    raw_nodes = raw.get("nodes", [])
    raw_edges = raw.get("edges", [])

    node_list: list[dict] = []
    seen_ids: set[str] = set()
    for i, n in enumerate(raw_nodes):
        rid = str(n.get("id") or n.get("label") or f"node{i}").strip().lower().replace(" ", "_")
        if not rid or rid in seen_ids:
            continue
        seen_ids.add(rid)
        node_list.append({
            "id": f"n-{rid}",
            "data": {"label": str(n.get("label") or rid).strip()},
        })
    _layout(node_list)

    edge_list: list[dict] = []
    for e in raw_edges:
        src = str(e.get("source", "")).strip().lower().replace(" ", "_")
        tgt = str(e.get("target", "")).strip().lower().replace(" ", "_")
        if src in seen_ids and tgt in seen_ids:
            edge_list.append({
                "id": f"e{len(edge_list)}",
                "source": f"n-{src}",
                "target": f"n-{tgt}",
            })

    return node_list, edge_list


# ── Heuristic redesign transformations ──

def _cost_optimized(nodes: list[dict], edges: list[dict]) -> dict[str, Any]:
    """Remove redundant components, consolidate services."""
    labels = list(node_labels(nodes).values())
    new_nodes = [n for n in nodes]
    new_edges = list(edges)
    changes = []
    trade_offs = []

    # Suggest consolidating services if > 6 nodes
    if len(nodes) > 6:
        changes.append({"type": "modified", "component": "Services", "description": "Consolidate microservices into fewer deployments to reduce per-service overhead"})
        trade_offs.append({"aspect": "Operational cost", "impact": "positive", "description": "Fewer containers = lower compute + orchestration cost"})
        trade_offs.append({"aspect": "Deployment independence", "impact": "negative", "description": "Merged services must be deployed together"})

    if has_component(labels, "redis", "cache"):
        changes.append({"type": "modified", "component": "Cache", "description": "Switch from dedicated Redis to application-level caching (LRU) for cost savings"})
        trade_offs.append({"aspect": "Infrastructure cost", "impact": "positive", "description": "Eliminates managed Redis cost ($50-200/month)"})

    changes.append({"type": "modified", "component": "Compute", "description": "Use spot/preemptible instances for stateless workers"})
    trade_offs.append({"aspect": "Cost", "impact": "positive", "description": "60-90% savings on worker compute"})
    trade_offs.append({"aspect": "Availability", "impact": "negative", "description": "Spot instances can be reclaimed with 2-min notice"})

    return {
        "redesigned_nodes": new_nodes,
        "redesigned_edges": new_edges,
        "changes": changes,
        "trade_offs": trade_offs,
        "summary": "Cost-optimized by consolidating services, replacing managed cache with application-level caching, and using spot instances for workers.",
    }


def _high_availability(nodes: list[dict], edges: list[dict]) -> dict[str, Any]:
    """Add redundancy, replicas, health checks."""
    labels = list(node_labels(nodes).values())
    new_nodes = list(nodes)
    new_edges = list(edges)
    changes = []
    trade_offs = []

    # Add replicas for databases
    if has_component(labels, "database", "db", "postgres", "mysql"):
        replica_id = f"n-db-replica-{len(new_nodes)}"
        new_nodes.append({"id": replica_id, "data": {"label": "DB Read Replica"}, "position": {"x": 0, "y": 0}})
        changes.append({"type": "added", "component": "DB Read Replica", "description": "Multi-AZ read replica for failover and read scaling"})

    if not has_component(labels, "health", "monitor", "prometheus", "grafana"):
        monitor_id = f"n-monitor-{len(new_nodes)}"
        new_nodes.append({"id": monitor_id, "data": {"label": "Health Monitor"}, "position": {"x": 0, "y": 0}})
        changes.append({"type": "added", "component": "Health Monitor", "description": "Centralized health monitoring with automatic failover triggers"})

    if not has_component(labels, "lb", "load", "balancer"):
        lb_id = f"n-lb-{len(new_nodes)}"
        new_nodes.append({"id": lb_id, "data": {"label": "Load Balancer"}, "position": {"x": 0, "y": 0}})
        changes.append({"type": "added", "component": "Load Balancer", "description": "Multi-AZ load balancer with health checks"})

    _layout(new_nodes)
    trade_offs.append({"aspect": "Availability", "impact": "positive", "description": "99.99% uptime target with automatic failover"})
    trade_offs.append({"aspect": "Cost", "impact": "negative", "description": "2-3x increase in database and compute costs for redundancy"})
    trade_offs.append({"aspect": "Complexity", "impact": "negative", "description": "More infrastructure to manage and monitor"})

    return {
        "redesigned_nodes": new_nodes,
        "redesigned_edges": new_edges,
        "changes": changes,
        "trade_offs": trade_offs,
        "summary": "High-availability redesign with multi-AZ database replicas, centralized health monitoring, and load balancer with health checks.",
    }


def _startup_mvp(nodes: list[dict], edges: list[dict]) -> dict[str, Any]:
    """Simplify to minimum viable architecture."""
    changes = []
    trade_offs = []
    mvp_nodes = [
        {"id": "n-client", "data": {"label": "Client"}, "position": {"x": 40, "y": 60}},
        {"id": "n-api", "data": {"label": "Monolith API"}, "position": {"x": 240, "y": 60}},
        {"id": "n-db", "data": {"label": "PostgreSQL"}, "position": {"x": 240, "y": 200}},
        {"id": "n-storage", "data": {"label": "Object Storage"}, "position": {"x": 440, "y": 60}},
    ]
    mvp_edges = [
        {"id": "e0", "source": "n-client", "target": "n-api"},
        {"id": "e1", "source": "n-api", "target": "n-db"},
        {"id": "e2", "source": "n-api", "target": "n-storage"},
    ]

    changes.append({"type": "modified", "component": "Architecture", "description": "Consolidated all microservices into a single monolith API"})
    changes.append({"type": "removed", "component": "Cache / Queue / Workers", "description": "Removed async processing layers — handle inline until needed"})

    trade_offs.append({"aspect": "Time to market", "impact": "positive", "description": "Ship in days instead of weeks"})
    trade_offs.append({"aspect": "Cost", "impact": "positive", "description": "Single server, single database — ~$20/month"})
    trade_offs.append({"aspect": "Scale ceiling", "impact": "negative", "description": "Good up to ~10K users, needs rearchitecture beyond that"})

    return {
        "redesigned_nodes": mvp_nodes,
        "redesigned_edges": mvp_edges,
        "changes": changes,
        "trade_offs": trade_offs,
        "summary": "Startup MVP with monolith API, single PostgreSQL database, and object storage. Ship fast, scale later.",
    }


def _default_redesign(nodes: list[dict], edges: list[dict], strategy: str) -> dict[str, Any]:
    """Fallback for strategies without specific heuristics."""
    return {
        "redesigned_nodes": nodes,
        "redesigned_edges": edges,
        "changes": [{"type": "modified", "component": "Architecture", "description": f"Optimization for {strategy} strategy requires LLM analysis. Configure an LLM provider for detailed redesign recommendations."}],
        "trade_offs": [{"aspect": "Analysis depth", "impact": "neutral", "description": "Configure an LLM provider (Groq, Gemini, Ollama) for AI-powered redesign suggestions."}],
        "summary": f"Architecture maintained as-is. Enable an LLM provider for {STRATEGIES.get(strategy, {}).get('name', strategy)} redesign.",
    }


def redesign_architecture(
    nodes: list[dict],
    edges: list[dict],
    strategy: str,
) -> dict[str, Any]:
    """Redesign architecture, preferring LLM with heuristic fallback."""
    # Try LLM first
    llm_result = redesign_llm(nodes, edges, strategy)
    if llm_result:
        redesigned_nodes, redesigned_edges = _build_redesigned_graph(llm_result)
        return {
            "strategy": strategy,
            "original_nodes": nodes,
            "original_edges": edges,
            "redesigned_nodes": redesigned_nodes,
            "redesigned_edges": redesigned_edges,
            "changes": llm_result.get("changes", []),
            "trade_offs": llm_result.get("trade_offs", []),
            "summary": llm_result.get("summary", "Architecture redesigned."),
        }

    # Heuristic fallback
    heuristic_fn = {
        "cost_optimized": _cost_optimized,
        "high_availability": _high_availability,
        "startup_mvp": _startup_mvp,
    }.get(strategy, lambda n, e: _default_redesign(n, e, strategy))

    result = heuristic_fn(nodes, edges)
    return {
        "strategy": strategy,
        "original_nodes": nodes,
        "original_edges": edges,
        **result,
    }
