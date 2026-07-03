"""Architecture Benchmarks Service — compares designs against standard industry patterns.

Reference patterns: Netflix-style microservices, Uber event-driven, Airbnb booking, Shopify commerce.
Calculates pattern matches, similarity scores, and highlights structural gaps.
"""

import json
from typing import Any, Dict, List
from app.services.llm import llm_complete, _extract_json
from app.services.diagram import node_labels

PATTERNS = {
    "netflix_microservices": {
        "name": "Netflix-style Microservices",
        "description": "High-volume media distribution model with microservice isolation, client-side load balancing, API gateway, circuit breaking, and heavy caching.",
        "key_components": ["API Gateway", "Service Registry", "Distributed Cache", "Circuit Breaker", "Relational/NoSQL stores"],
    },
    "uber_event_driven": {
        "name": "Uber Event-Driven / Geospatial",
        "description": "Low-latency event-driven routing model using geospatial indexing, publish-subscribe queues (Kafka), real-time map matching, and stream processing.",
        "key_components": ["Message Queue (Kafka)", "Stream Processing", "Geospatial Index (H3/S2)", "WebSockets", "Cache"],
    },
    "airbnb_booking": {
        "name": "Airbnb Booking Platform",
        "description": "Transactional reservation model with read-heavy search indices, write-heavy checkout flows, dual-write consistency, and background asynchronous jobs.",
        "key_components": ["Search Index (Elasticsearch)", "Relational Database (Transactional)", "Background Workers", "Message Queue", "Cache"],
    },
    "shopify_commerce": {
        "name": "Shopify Commerce Platform",
        "description": "Tenant-isolated multi-tenant store architecture with modular monolith/services, heavy static content caching (CDN), read replication, and flash sale queue protection.",
        "key_components": ["CDN", "Tenant router", "Database (Postgres/MySQL)", "Cache (Redis)", "Background Queue"],
    }
}

_BENCHMARK_SYSTEM = (
    "You are a systems architecture evaluator.\n"
    "Compare the uploaded design against standard industry blueprints: Netflix Microservices, Uber Event-Driven, Airbnb Booking, and Shopify Commerce.\n"
    "Respond ONLY with valid JSON in a code block using this schema:\n"
    "{\n"
    '  "overall_similarity_pct": 65,\n'
    '  "pattern_evaluations": [\n'
    '    {\n'
    '      "pattern_key": "netflix_microservices",\n'
    '      "pattern_name": "Netflix-style Microservices",\n'
    '      "similarity_score_pct": 75,\n'
    '      "matched_features": ["API Gateway", "Distributed Cache"],\n'
    '      "missing_features": ["Service Registry", "Circuit Breakers"],\n'
    '      "analysis": "Brief description of why they are similar, and structural gaps."\n'
    '    }\n'
    '  ],\n'
    '  "key_recommendation": "Main structural change suggested to better align with high-scale standards."\n'
    "}"
)

def _build_benchmark_prompt(labels: List[str], connections: List[str]) -> str:
    return (
        f"Architecture components: {', '.join(labels)}\n"
        f"Connections: {'; '.join(connections)}\n\n"
        "Evaluate this architecture against these four industry patterns: "
        "netflix_microservices, uber_event_driven, airbnb_booking, shopify_commerce. "
        "For each pattern, calculate a similarity score (%), list matched components, "
        "missing components, and analyze the gaps. Return the overall benchmark analysis."
    )

def benchmark_architecture_llm(nodes: List[dict], edges: List[dict]) -> Dict[str, Any] | None:
    labels = node_labels(nodes)
    connections = [
        f"{labels.get(e.get('source', ''), '?')} -> {labels.get(e.get('target', ''), '?')}"
        for e in edges
    ]
    prompt = _build_benchmark_prompt(list(labels.values()), connections)
    result = llm_complete(_BENCHMARK_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)

def benchmark_architecture_heuristic(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    labels = [l.lower() for l in node_labels(nodes).values()]
    evals = []
    
    # Heuristically check matching for each pattern
    for key, info in PATTERNS.items():
        matched = []
        missing = []
        
        # Simple string-matching checks
        for comp in info["key_components"]:
            comp_lower = comp.lower()
            # Split up standard names
            keywords = []
            if "gateway" in comp_lower:
                keywords = ["gateway", "proxy", "nginx", "kong"]
            elif "cache" in comp_lower:
                keywords = ["cache", "redis", "memcached"]
            elif "queue" in comp_lower:
                keywords = ["queue", "kafka", "rabbitmq", "sqs", "pubsub"]
            elif "db" in comp_lower or "database" in comp_lower or "store" in comp_lower:
                keywords = ["db", "database", "postgres", "mysql", "dynamo", "cassandra", "sql"]
            elif "registry" in comp_lower:
                keywords = ["registry", "consul", "eureka", "zookeeper"]
            elif "breaker" in comp_lower:
                keywords = ["breaker", "hystrix", "resilience"]
            elif "stream" in comp_lower:
                keywords = ["stream", "flink", "spark", "storm"]
            elif "geo" in comp_lower:
                keywords = ["geo", "spatial", "h3", "s2", "map"]
            elif "websocket" in comp_lower:
                keywords = ["websocket", "socket", "ws"]
            elif "search" in comp_lower:
                keywords = ["search", "elastic", "opensearch", "solr"]
            elif "worker" in comp_lower:
                keywords = ["worker", "background", "job", "celery"]
            elif "cdn" in comp_lower:
                keywords = ["cdn", "cloudfront", "cloudflare"]
            else:
                keywords = [comp_lower]

            if any(any(kw in l for kw in keywords) for l in labels):
                matched.append(comp)
            else:
                missing.append(comp)

        total = len(info["key_components"])
        matched_count = len(matched)
        score = round((matched_count / total) * 100) if total > 0 else 0

        analysis = ""
        if score > 70:
            analysis = f"Strong alignment with the {info['name']} model. Most foundational elements exist."
        elif score > 40:
            analysis = f"Moderate alignment. You have core components but lack key scalability or orchestration primitives like {', '.join(missing[:2])}."
        else:
            analysis = f"Low alignment. This architecture lacks the specific event-driven or distribution components characteristic of {info['name']}."

        evals.append({
            "pattern_key": key,
            "pattern_name": info["name"],
            "similarity_score_pct": score,
            "matched_features": matched,
            "missing_features": missing,
            "analysis": analysis,
        })

    evals.sort(key=lambda x: x["similarity_score_pct"], reverse=True)
    avg_sim = round(sum(e["similarity_score_pct"] for e in evals) / len(evals))

    key_rec = "Add asynchronous message queues and cache replication to elevate this architecture to high-scale industry standards."
    if evals[0]["similarity_score_pct"] > 80:
        key_rec = f"Your architecture matches closely with {evals[0]['pattern_name']}. Focus on adding observability or fine-tuning database indexes next."

    return {
        "overall_similarity_pct": avg_sim,
        "pattern_evaluations": evals,
        "key_recommendation": key_rec,
    }

def benchmark_architecture(nodes: List[dict], edges: List[dict]) -> Dict[str, Any]:
    llm_res = benchmark_architecture_llm(nodes, edges)
    if llm_res and "pattern_evaluations" in llm_res:
        return llm_res
    return benchmark_architecture_heuristic(nodes, edges)
