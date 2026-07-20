"""Real architecture pattern detection for industry-standard systems."""

from dataclasses import dataclass, field
from typing import Any


@dataclass
class PatternMatch:
    name: str
    similarity: float  # 0.0 - 1.0
    matched_components: list[str] = field(default_factory=list)
    missing_components: list[str] = field(default_factory=list)
    score: int = 0     # 0-100 structural health score
    description: str = ""


# Industry-standard architecture patterns with their required components
PATTERNS: dict[str, dict[str, Any]] = {
    "Netflix Microservices": {
        "keywords": ["cdn", "api gateway", "microservice", "service mesh", "circuit breaker", "chaos monkey",
                     "spinnaker", "eureka", "hystrix", "zuul"],
        "key_components": ["cdn", "api gateway"],
        "expected_components": [
            "cdn", "api gateway", "service registry", "config server",
            "circuit breaker", "load balancer", "monitoring", "logging",
            "distributed tracing", "chaos engineering",
        ],
        "description": "Netflix OSS-inspired microservices ecosystem with service discovery, circuit breakers, and chaos engineering.",
        "score_ranges": {"high": (80, 100), "medium": (50, 79), "low": (0, 49)},
    },
    "Uber Event-Driven": {
        "keywords": ["event bus", "kafka", "rabbitmq", "message queue", "pub/sub", "dispatcher",
                     "event sourcing", "cqrs", "debezium", "kinesis"],
        "key_components": ["message queue", "event bus"],
        "expected_components": [
            "message queue", "event bus", "dispatcher", "consumer group",
            "stream processor", "database", "cache", "monitoring",
            "dead letter queue", "schema registry",
        ],
        "description": "Event-driven architecture with domain-oriented microservices, reliable messaging, and stream processing.",
        "score_ranges": {"high": (80, 100), "medium": (50, 79), "low": (0, 49)},
    },
    "Airbnb Booking System": {
        "keywords": ["search", "booking", "payment", "calendar", "reservation", "pricing engine",
                     "availability", "search index", "elasticsearch", "recommendation"],
        "key_components": ["search", "booking service"],
        "expected_components": [
            "search service", "booking service", "payment service", "user service",
            "calendar service", "pricing engine", "notification service", "review service",
            "message service", "search index",
        ],
        "description": "Multi-service booking platform with search, reservations, payments, and dynamic pricing.",
        "score_ranges": {"high": (80, 100), "medium": (50, 79), "low": (0, 49)},
    },
    "Shopify Commerce": {
        "keywords": ["storefront", "checkout", "cart", "inventory", "order", "catalog",
                     "payment gateway", "shipping", "tax", "fulfillment"],
        "key_components": ["storefront", "checkout"],
        "expected_components": [
            "storefront", "checkout", "cart service", "catalog service",
            "inventory service", "order service", "payment gateway", "shipping service",
            "tax service", "fulfillment service", "notification service",
        ],
        "description": "Modular commerce platform with catalog, cart, checkout, payments, and fulfillment pipelines.",
        "score_ranges": {"high": (80, 100), "medium": (50, 79), "low": (0, 49)},
    },
}


def detect_patterns(node_labels: list[str], edge_descriptions: list[str]) -> list[PatternMatch]:
    """Detect known architecture patterns from node labels and edge descriptions.
    
    Returns list of PatternMatch ordered by similarity (highest first).
    Empty list if no patterns detected.
    """
    labels_lower = [label.lower() for label in node_labels]
    edges_text = " ".join(edge_descriptions).lower()
    all_text = " ".join(labels_lower) + " " + edges_text
    
    results: list[PatternMatch] = []
    
    for pattern_name, config in PATTERNS.items():
        matched_keywords = [kw for kw in config["keywords"] if kw in all_text]
        matched_components = [c for c in config["expected_components"] if c in all_text]
        
        if not matched_components and len(matched_keywords) < 2:
            continue  # Not enough signal
        
        total_expected = len(config["expected_components"])
        similarity = len(matched_components) / total_expected if total_expected > 0 else 0
        
        # Boost similarity with keyword matches
        keyword_ratio = len(matched_keywords) / max(len(config["keywords"]), 1)
        similarity = max(similarity, keyword_ratio * 0.6)
        
        # Clamp similarity
        similarity = min(1.0, similarity * 1.2)
        
        missing = [c for c in config["expected_components"] if c not in matched_components]
        
        # Calculate structural health score
        score = _calculate_pattern_score(similarity, matched_components, missing, pattern_name)
        
        results.append(PatternMatch(
            name=pattern_name,
            similarity=round(similarity, 2),
            matched_components=matched_components,
            missing_components=missing,
            score=score,
            description=config["description"],
        ))
    
    results.sort(key=lambda r: r.similarity, reverse=True)
    return results


def _calculate_pattern_score(similarity: float, matched: list[str], missing: list[str], pattern_name: str) -> int:
    """Calculate structural health score (0-100) for a pattern match."""
    config = PATTERNS.get(pattern_name, {})
    ranges = config.get("score_ranges", {})
    
    if similarity >= 0.7:
        base = ranges.get("high", (80, 100))[0]
    elif similarity >= 0.4:
        base = ranges.get("medium", (50, 79))[0]
    else:
        base = ranges.get("low", (0, 49))[0]
    
    # Penalize missing key components
    key_components = config.get("key_components", [])
    missing_keys = [c for c in key_components if c not in matched]
    penalty = len(missing_keys) * 15
    
    return max(0, min(100, base - penalty))
