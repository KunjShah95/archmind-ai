"""Chaos/Failure Simulator Service — evaluates system resiliency and blast radius.

Simulates failure scenarios such as component crashes, region outages, and queue unavailable.
Calculates cascading impacts and suggests mitigation strategies.
"""

from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json
from app.services.diagram import node_labels

_CHAOS_SYSTEM = (
    "You are a Site Reliability Engineering (SRE) agent specializing in chaos engineering and failure mode analysis.\n"
    "Given an architecture graph and a failed component, calculate the blast radius and recovery strategies.\n"
    "Respond ONLY with valid JSON in a code block matching this schema:\n"
    "{\n"
    '  "failed_node_id": "n-cache",\n'
    '  "blast_radius_node_ids": ["n-cache", "n-orders"],\n'
    '  "cascading_failures": [\n'
    '    {"node_id": "n-orders", "reason": "Synchronous database overload as cached queries fall through"}\n'
    '  ],\n'
    '  "recovery_time_estimation": "5-15 minutes",\n'
    '  "severity": "high",\n'
    '  "mitigation_strategies": [\n'
    '    "Implement cache fallback to serve slightly stale read data instead of failing",\n'
    '    "Use rate-limiting/throttling on database requests when cache misses spike to avoid DB lockup"\n'
    '  ],\n'
    '  "summary": "High-level summary of the failure blast radius and recovery posture."\n'
    "}"
)

def _build_chaos_prompt(labels: Dict[str, str], failed_node_id: str, connections: List[str]) -> str:
    failed_label = labels.get(failed_node_id, failed_node_id)
    return (
        f"Components: {', '.join([f'{k}: {v}' for k, v in labels.items()])}\n"
        f"Connections: {'; '.join(connections)}\n"
        f"Failed Component: ID={failed_node_id} Label='{failed_label}'\n\n"
        "Calculate the blast radius (which components will fail or degrade downstream), "
        "any cascading failure paths, estimated recovery time, severity (low, medium, high, critical), "
        "and concrete SRE mitigations (e.g. circuit breakers, retries, fallbacks)."
    )

def simulate_failure_llm(nodes: List[dict], edges: List[dict], failed_node_id: str) -> Dict[str, Any] | None:
    labels = node_labels(nodes)
    connections = [
        f"{labels.get(e.get('source', ''), '?')} ({e.get('source')}) -> {labels.get(e.get('target', ''), '?')} ({e.get('target')})"
        for e in edges
    ]
    prompt = _build_chaos_prompt(labels, failed_node_id, connections)
    result = llm_complete(_CHAOS_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def simulate_failure_heuristic(nodes: List[dict], edges: List[dict], failed_node_id: str) -> Dict[str, Any]:
    labels = node_labels(nodes)
    failed_label = labels.get(failed_node_id, failed_node_id).lower()

    # Traverse dependency paths downwards starting from failed_node_id (simple DFS/BFS)
    blast_radius = {failed_node_id}
    cascading = []
    
    # Simple BFS of downstream dependencies
    # If source fails, target is affected (downstream)
    queue = [failed_node_id]
    visited = {failed_node_id}

    while queue:
        curr = queue.pop(0)
        # Find edges where curr is target OR source
        # In software architectures, if service A depends on DB B:
        # A (source) -> B (target). If B fails, A is affected.
        # So we traverse BACKWARDS against the arrow to find affected clients,
        # and FORWARDS to find downstream write/read blocks.
        # Let's check both ways.
        for e in edges:
            src = e.get("source")
            tgt = e.get("target")
            
            # If target fails, source (client) is affected
            if tgt == curr and src not in visited:
                visited.add(src)
                blast_radius.add(src)
                queue.append(src)
                cascading.append({
                    "node_id": src,
                    "reason": f"Dependency failed: {labels.get(curr, curr)} is down or unreachable."
                })
            
            # Downstream impact (e.g. queue worker fails, queue piles up)
            if src == curr and tgt not in visited:
                # Some downstream nodes might not fail immediately, but let's count them
                visited.add(tgt)
                blast_radius.add(tgt)
                queue.append(tgt)
                cascading.append({
                    "node_id": tgt,
                    "reason": f"Upstream source failed: {labels.get(curr, curr)} stopped sending traffic."
                })

    # Estimate recovery, severity and mitigations based on type of component
    severity = "medium"
    recovery = "5-10 minutes"
    mitigations = [
        "Implement timeout configurations and connection pool limits",
        "Enable health alerts and automated restart routines"
    ]

    if "db" in failed_label or "database" in failed_label or "postgres" in failed_label or "mysql" in failed_label:
        severity = "critical"
        recovery = "15-30 minutes"
        mitigations = [
            "Enable multi-AZ failover replication with automated DNS updates",
            "Introduce read-only degraded mode for API endpoints during DB downtime",
            "Configure connection pooling queue limits to avoid database socket starvation"
        ]
    elif "redis" in failed_label or "cache" in failed_label:
        severity = "high"
        recovery = "5-15 minutes"
        mitigations = [
            "Implement cache-bypass mechanisms to request data directly from the DB on cache connection failure",
            "Use rate-limiting on fallback routes to prevent database crash on cache miss storm"
        ]
    elif "api" in failed_label or "gateway" in failed_label:
        severity = "critical"
        recovery = "2-5 minutes"
        mitigations = [
            "Route traffic directly to backup API Gateway instances via DNS georouting",
            "Deploy static status pages on CDN edge for client failover"
        ]
    elif "queue" in failed_label or "kafka" in failed_label or "mq" in failed_label:
        severity = "high"
        recovery = "10-20 minutes"
        mitigations = [
            "Buffer writes locally or fall back to direct sync database write on queue unavailability",
            "Implement dead-letter queuing to separate unprocessable requests"
        ]

    summary = (
        f"Failure of '{labels.get(failed_node_id, failed_node_id)}' affects {len(blast_radius)} components. "
        f"This constitutes a {severity.upper()} severity incident with downstream service degradation."
    )

    return {
        "failed_node_id": failed_node_id,
        "blast_radius_node_ids": list(blast_radius),
        "cascading_failures": cascading,
        "recovery_time_estimation": recovery,
        "severity": severity,
        "mitigation_strategies": mitigations,
        "summary": summary
    }

def simulate_failure(nodes: List[dict], edges: List[dict], failed_node_id: str) -> Dict[str, Any]:
    llm_res = simulate_failure_llm(nodes, edges, failed_node_id)
    if llm_res and "blast_radius_node_ids" in llm_res:
        return llm_res
    return simulate_failure_heuristic(nodes, edges, failed_node_id)
