"""Traffic Simulation Service — estimates system behavior at different scales.

Simulates load for 1K, 100K, 1M, 10M, and 100M users.
Estimates latency, throughput, cost, autoscaling, and failure points.
"""

import json
from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json
from app.services.diagram import node_labels

_SIMULATE_SYSTEM = (
    "You are a systems performance engineering agent. "
    "Analyze the provided architecture and simulate its performance characteristics under different user scales.\n"
    "Respond ONLY with valid JSON inside a code block, using this schema:\n"
    "{\n"
    '  "results": {\n'
    '    "1K": {"throughput_rps": 120, "latency_p50_ms": 15, "latency_p95_ms": 45, "latency_p99_ms": 90, "infra_cost_monthly_usd": 50, "autoscaling_instances": 2, "bottlenecks": []},\n'
    '    "100K": {"throughput_rps": 12000, "latency_p50_ms": 25, "latency_p95_ms": 75, "latency_p99_ms": 150, "infra_cost_monthly_usd": 350, "autoscaling_instances": 8, "bottlenecks": ["DB CPU usage"]},\n'
    '    "1M": {"throughput_rps": 120000, "latency_p50_ms": 50, "latency_p95_ms": 180, "latency_p99_ms": 400, "infra_cost_monthly_usd": 1500, "autoscaling_instances": 24, "bottlenecks": ["DB Connection Pool limit", "Cache bandwidth Limit"]},\n'
    '    "10M": {"throughput_rps": 1200000, "latency_p50_ms": 120, "latency_p95_ms": 450, "latency_p99_ms": 1200, "infra_cost_monthly_usd": 8000, "autoscaling_instances": 110, "bottlenecks": ["Single primary database write throttle", "API Gateway connection timeouts"]},\n'
    '    "100M": {"throughput_rps": 12000000, "latency_p50_ms": 450, "latency_p95_ms": 1900, "latency_p99_ms": 5000, "infra_cost_monthly_usd": 45000, "autoscaling_instances": 650, "bottlenecks": ["Database partition locks", "Network bandwidth exhaustion", "Extreme cascade failures"]}\n'
    '  },\n'
    '  "summary": "High-level summary of how this system scales, its primary scale limits, and recommended mitigation strategies."\n'
    "}"
)

def _build_simulation_prompt(labels: List[str], connections: List[str]) -> str:
    return (
        f"Architecture components: {', '.join(labels)}\n"
        f"Connections: {'; '.join(connections)}\n\n"
        "Evaluate the performance characteristics under five distinct levels of scale: "
        "1K active users, 100K active users, 1M active users, 10M active users, and 100M active users. "
        "Estimate realistic throughput (RPS), p50/p95/p99 latency (ms), monthly cost (USD), instance count, and specific bottlenecks for each. "
        "Also write a general scaling summary."
    )

def simulate_traffic_llm(nodes: List[dict], edges: List[dict]) -> Dict[str, Any] | None:
    labels = list(node_labels(nodes).values())
    connections = [
        f"{labels.get(e.get('source', ''), '?')} -> {labels.get(e.get('target', ''), '?')}"
        for e in edges
    ]
    prompt = _build_simulation_prompt(labels, connections)
    result = llm_complete(_SIMULATE_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def simulate_traffic_heuristic(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    # Heuristic fallback calculation
    labels = list(node_labels(nodes).values())
    node_count = len(nodes)
    
    # Check for cache and queue components
    has_cache = any(any(k in l.lower() for k in ["cache", "redis", "memcached"]) for l in labels)
    has_queue = any(any(k in l.lower() for k in ["queue", "kafka", "rabbitmq", "sqs", "pubsub"]) for l in labels)
    has_db_replica = any(any(k in l.lower() for k in ["replica", "secondary", "slave", "read-replica"]) for l in labels)

    results = {}
    scales = [
        ("1K", 1, 20, 1.0, 1.0),
        ("100K", 100, 30, 1.2, 1.5),
        ("1M", 1000, 45, 1.8, 3.0),
        ("10M", 10000, 80, 3.5, 8.0),
        ("100M", 100000, 200, 9.0, 25.0),
    ]

    for label, multiplier, base_latency, latency_deg, cost_deg in scales:
        rps = int(100 * multiplier)
        
        # Latency multiplier depends on architectural scaling elements
        lat_mult = 1.0
        bottlenecks = []

        if label in ["10M", "100M"]:
            if not has_cache:
                lat_mult *= 2.5
                bottlenecks.append("Database read bottleneck (no cache detected)")
            if not has_queue:
                lat_mult *= 2.0
                bottlenecks.append("Synchronous service blockage (no message queue detected)")
            if not has_db_replica:
                lat_mult *= 1.8
                bottlenecks.append("Relational Database write saturation")

        if node_count > 8 and label in ["1M", "10M", "100M"]:
            bottlenecks.append("Microservice coordination overhead")

        p50 = int(base_latency * latency_deg * lat_mult)
        p95 = int(p50 * 2.5)
        p99 = int(p50 * 5.0)

        # Estimate costs based on node count and multiplier
        cost = int(node_count * 25 * cost_deg)
        instances = max(2, int(node_count * 0.5 * multiplier ** 0.5))

        results[label] = {
            "throughput_rps": rps,
            "latency_p50_ms": p50,
            "latency_p95_ms": p95,
            "latency_p99_ms": p99,
            "infra_cost_monthly_usd": cost,
            "autoscaling_instances": instances,
            "bottlenecks": bottlenecks if bottlenecks else ["No immediate critical bottlenecks"],
        }

    summary = (
        f"This system has {node_count} components. "
        "At lower scales (1K to 100K users), latency remains stable. "
        "As scale approaches 10M+ users, scaling limitations will arise. "
    )
    if not has_cache:
        summary += "Adding a Redis cache layer is highly recommended to offload read traffic. "
    if not has_queue:
        summary += "Adding an asynchronous message queue (e.g. SQS/Kafka) will mitigate write-heavy spikes. "
    summary += "Overall scaling viability is moderate. Optimize database connections and scale stateless services."

    return {"results": results, "summary": summary}

def simulate_traffic(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    llm_res = simulate_traffic_llm(nodes, edges)
    if llm_res and "results" in llm_res:
        return llm_res
    return simulate_traffic_heuristic(nodes, edges)
