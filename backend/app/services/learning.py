"""Architecture Learning Mode — explains every component for education.

Provides structured explanations of what each component does, why it's used,
alternatives, best practices, and common mistakes. Great for students and
junior engineers learning system design.
"""

from typing import Any

from app.services.llm import llm_complete, _extract_json
from app.services.diagram import node_labels


# ── Component knowledge base (heuristic fallback) ─────────────────────

COMPONENT_KNOWLEDGE: dict[str, dict[str, Any]] = {
    "api gateway": {
        "what_it_does": "Routes incoming client requests to appropriate backend services. Handles cross-cutting concerns like authentication, rate limiting, request transformation, and load balancing.",
        "why_used": "Centralizes common functionality so individual services don't duplicate auth, rate limiting, or routing logic. Provides a single entry point for clients.",
        "alternatives": [
            {"name": "Service Mesh (Istio/Linkerd)", "trade_off": "More complex but handles service-to-service communication too"},
            {"name": "Reverse Proxy (Nginx/Traefik)", "trade_off": "Simpler, less feature-rich but lower overhead"},
            {"name": "Direct client-to-service", "trade_off": "No extra hop but duplicates cross-cutting concerns"},
        ],
        "best_practices": [
            "Implement request/response caching for frequently accessed endpoints",
            "Set up rate limiting per client/API key to prevent abuse",
            "Use circuit breakers to prevent cascading failures",
            "Log all requests for debugging and audit trails",
            "Implement request validation before forwarding to services",
        ],
        "common_mistakes": [
            "Making the gateway a bottleneck by running a single instance",
            "Putting business logic in the gateway instead of backend services",
            "Not implementing proper timeout handling",
            "Ignoring response compression for large payloads",
        ],
    },
    "load balancer": {
        "what_it_does": "Distributes incoming network traffic across multiple servers to ensure no single server bears too much demand. Improves responsiveness and availability.",
        "why_used": "Enables horizontal scaling — add more servers behind the balancer as traffic grows. Provides high availability by routing around failed servers.",
        "alternatives": [
            {"name": "DNS Round Robin", "trade_off": "Simplest option but no health checks or session affinity"},
            {"name": "Client-side load balancing", "trade_off": "Eliminates the proxy hop but requires client awareness of servers"},
            {"name": "Service Mesh", "trade_off": "Built-in load balancing with advanced routing rules"},
        ],
        "best_practices": [
            "Use health checks to detect and route around unhealthy instances",
            "Choose the right algorithm: round-robin for stateless, least-connections for variable workloads",
            "Enable connection draining for graceful shutdowns during deployments",
            "Deploy in multiple availability zones for redundancy",
        ],
        "common_mistakes": [
            "Single load balancer without failover (single point of failure)",
            "Not configuring health check endpoints properly",
            "Using sticky sessions when stateless design would be better",
            "Ignoring SSL/TLS termination configuration",
        ],
    },
    "database": {
        "what_it_does": "Stores and retrieves structured data. Provides ACID transactions, indexing, query optimization, and data integrity constraints.",
        "why_used": "Every application needs durable data storage. Relational databases provide structured schemas, powerful queries with SQL, and transaction guarantees.",
        "alternatives": [
            {"name": "NoSQL (MongoDB/DynamoDB)", "trade_off": "Flexible schema, better horizontal scaling, but weaker consistency guarantees"},
            {"name": "NewSQL (CockroachDB/Spanner)", "trade_off": "Global distribution with SQL, but higher cost and complexity"},
            {"name": "Serverless DB (PlanetScale/Neon)", "trade_off": "Zero infrastructure management, but vendor lock-in and potential cold starts"},
        ],
        "best_practices": [
            "Design indexes based on your query patterns, not just primary keys",
            "Use connection pooling (PgBouncer) to manage database connections efficiently",
            "Implement read replicas for read-heavy workloads",
            "Set up automated backups and test restore procedures regularly",
            "Use migrations for schema changes — never modify production schema manually",
        ],
        "common_mistakes": [
            "Not adding indexes for frequently queried columns",
            "Opening a new database connection per request instead of pooling",
            "Storing large binary data (images, videos) directly in the database",
            "Not planning for schema migrations from day one",
            "Ignoring query performance until it becomes a crisis",
        ],
    },
    "cache": {
        "what_it_does": "Stores frequently accessed data in memory for sub-millisecond retrieval. Reduces load on the primary database and dramatically improves response times.",
        "why_used": "Databases are the most common bottleneck. Caching hot data in memory (Redis/Memcached) can reduce database load by 80-95% and improve p99 latency from 100ms to <1ms.",
        "alternatives": [
            {"name": "Application-level cache (LRU)", "trade_off": "No extra infrastructure, but not shared across instances"},
            {"name": "CDN edge caching", "trade_off": "Great for static content, but not for dynamic/personalized data"},
            {"name": "Database materialized views", "trade_off": "Built into the DB, but less flexible invalidation"},
        ],
        "best_practices": [
            "Define a clear cache invalidation strategy (TTL, event-driven, write-through)",
            "Use cache-aside pattern: check cache → miss → query DB → populate cache",
            "Set appropriate TTLs — too long risks stale data, too short reduces hit rate",
            "Monitor cache hit ratio — aim for >90% for frequently accessed data",
            "Plan for cache failures — your app should work (slower) without cache",
        ],
        "common_mistakes": [
            "Caching everything without analyzing access patterns",
            "Not handling cache stampede (thundering herd) on cache miss",
            "Storing sensitive data in cache without encryption",
            "Single-node cache without replication (single point of failure)",
        ],
    },
    "message queue": {
        "what_it_does": "Enables asynchronous communication between services. Producers send messages to the queue; consumers process them independently at their own pace.",
        "why_used": "Decouples services so they can scale independently. Absorbs traffic spikes (backpressure). Ensures no work is lost even if a consumer is temporarily down.",
        "alternatives": [
            {"name": "Direct HTTP calls", "trade_off": "Simpler but tightly couples services and blocks on slow consumers"},
            {"name": "Event streaming (Kafka)", "trade_off": "Full event log with replay, but more complex to operate"},
            {"name": "Webhooks", "trade_off": "Simple push model, but requires the receiver to be available"},
        ],
        "best_practices": [
            "Always configure a dead-letter queue (DLQ) for failed messages",
            "Make consumers idempotent — they may process the same message twice",
            "Set up monitoring on queue depth to detect consumer lag",
            "Use message TTLs to prevent infinite buildup of stale messages",
            "Choose between at-least-once and exactly-once based on your requirements",
        ],
        "common_mistakes": [
            "Not implementing dead-letter queues — poison messages block the entire queue",
            "Assuming exactly-once delivery without verifying your queue's guarantees",
            "Putting too much data in messages instead of using references",
            "Not monitoring queue depth — silent backlog can cause hours of delay",
        ],
    },
    "cdn": {
        "what_it_does": "Content Delivery Network — caches and serves static content (images, JS, CSS) from edge servers geographically close to users. Reduces latency and origin server load.",
        "why_used": "Users worldwide get fast load times regardless of where the origin server is. Reduces bandwidth costs and protects the origin from traffic spikes and DDoS attacks.",
        "alternatives": [
            {"name": "Self-hosted Nginx with geo-distribution", "trade_off": "Full control but expensive to operate globally"},
            {"name": "Object storage direct access (S3)", "trade_off": "Simple but no edge caching or global distribution"},
            {"name": "Multi-region deployment", "trade_off": "Dynamic content close to users, but very complex"},
        ],
        "best_practices": [
            "Use content hashing in filenames for cache busting (app.a1b2c3.js)",
            "Set long TTLs for immutable assets and short TTLs for dynamic content",
            "Enable Brotli/gzip compression at the edge",
            "Configure custom error pages and failover behavior",
            "Use signed URLs for private content distribution",
        ],
        "common_mistakes": [
            "Caching API responses that should be dynamic",
            "Not invalidating cache after deployments",
            "Ignoring cache-control headers on the origin server",
            "Serving user-specific content through the CDN without proper vary headers",
        ],
    },
    "auth": {
        "what_it_does": "Authentication verifies who the user is (login). Authorization determines what they can do (permissions). Together they protect your system from unauthorized access.",
        "why_used": "Every multi-user system needs identity management. Proper auth prevents unauthorized data access, protects user accounts, and enables audit trails.",
        "alternatives": [
            {"name": "Auth0/Okta (managed)", "trade_off": "Fast to implement, but per-user pricing adds up at scale"},
            {"name": "Firebase Auth", "trade_off": "Free tier is generous, but limited customization"},
            {"name": "Custom auth", "trade_off": "Full control, but high security risk if done incorrectly"},
        ],
        "best_practices": [
            "Use industry standards: OAuth 2.0 for authorization, OpenID Connect for authentication",
            "Store passwords with bcrypt/argon2 — never plain text or simple hashes",
            "Implement token refresh with short-lived access tokens (15 min) and longer refresh tokens",
            "Add multi-factor authentication (MFA) for sensitive operations",
            "Log all auth events for security monitoring",
        ],
        "common_mistakes": [
            "Rolling your own crypto or token format instead of using JWT/OAuth standards",
            "Long-lived access tokens that can't be revoked",
            "Not rate-limiting login attempts (enables brute force attacks)",
            "Storing tokens in localStorage (vulnerable to XSS) — use httpOnly cookies",
        ],
    },
    "worker": {
        "what_it_does": "Background process that handles long-running or resource-intensive tasks asynchronously. Dequeues work from a message queue and processes it independently of the request/response cycle.",
        "why_used": "Keeps the API responsive by offloading slow tasks (email sending, image processing, report generation) to background workers that can retry on failure.",
        "alternatives": [
            {"name": "Inline processing", "trade_off": "Simpler but blocks the request and risks timeouts"},
            {"name": "Serverless functions (Lambda)", "trade_off": "Auto-scales to zero cost, but cold starts and 15-min limit"},
            {"name": "Cron jobs", "trade_off": "Good for scheduled work, not for on-demand async processing"},
        ],
        "best_practices": [
            "Make workers idempotent — safe to retry the same job",
            "Implement graceful shutdown for zero-downtime deployments",
            "Set job timeouts to prevent stuck workers from blocking the queue",
            "Use exponential backoff for retries",
            "Monitor worker throughput and lag",
        ],
        "common_mistakes": [
            "Not handling poison messages — one bad job kills all processing",
            "Workers that aren't idempotent — retries cause duplicate side effects",
            "No monitoring on worker lag — silent backlog grows for hours",
            "Running workers on the same process as the API server",
        ],
    },
}

# Mapping keywords to knowledge base entries
_KEYWORD_MAP = {
    "api gateway": ["api", "gateway", "kong", "nginx", "traefik", "apigee"],
    "load balancer": ["lb", "load", "balancer", "elb", "alb", "nlb"],
    "database": ["db", "database", "postgres", "mysql", "rds", "sql", "mongo", "dynamo"],
    "cache": ["redis", "cache", "memcached", "elasticache"],
    "message queue": ["queue", "sqs", "kafka", "rabbitmq", "pubsub", "nats", "bullmq"],
    "cdn": ["cdn", "cloudfront", "cloudflare", "fastly", "akamai"],
    "auth": ["auth", "cognito", "oauth", "identity", "login", "sso", "okta", "auth0"],
    "worker": ["worker", "consumer", "processor", "job", "celery", "sidekiq"],
}


def _match_component(label: str) -> str | None:
    """Find the best matching knowledge base entry for a node label."""
    lower = label.lower()
    for component, keywords in _KEYWORD_MAP.items():
        if any(kw in lower for kw in keywords):
            return component
    return None


# ── LLM-based explanations ──────────────────────────────────────────

_LEARN_SYSTEM = (
    "You are a patient, expert systems architecture teacher. "
    "Explain components clearly for students and junior engineers. "
    "Respond ONLY with valid JSON:\n"
    "{\n"
    '  "what_it_does": "Clear explanation of what this component does",\n'
    '  "why_used": "Why this component is used in this specific architecture",\n'
    '  "alternatives": [{"name": "...", "trade_off": "..."}],\n'
    '  "best_practices": ["..."],\n'
    '  "common_mistakes": ["..."]\n'
    "}"
)


def explain_component_llm(
    component_label: str,
    all_labels: list[str],
    edge_descriptions: list[str],
) -> dict[str, Any] | None:
    """Get an LLM-generated explanation for a specific component."""
    prompt = (
        f"Explain the '{component_label}' component in this architecture:\n"
        f"All components: {', '.join(all_labels)}\n"
        f"Connections: {'; '.join(edge_descriptions[:15])}\n\n"
        f"Focus on:\n"
        f"1. What '{component_label}' does in plain language\n"
        f"2. Why it's used in THIS architecture specifically\n"
        f"3. 3 alternatives with trade-offs\n"
        f"4. 5 best practices\n"
        f"5. 4 common mistakes beginners make"
    )
    result = llm_complete(_LEARN_SYSTEM, prompt)
    if not result:
        return None
    return _extract_json(result)


def explain_component(
    node_id: str,
    nodes: list[dict],
    edges: list[dict],
) -> dict[str, Any]:
    """Explain a single component — LLM first, then knowledge base fallback."""
    labels = node_labels(nodes)
    component_label = labels.get(node_id, node_id.replace("n-", ""))
    all_labels = list(labels.values())
    edge_desc = [
        f"{labels.get(e.get('source', ''), '?')} -> {labels.get(e.get('target', ''), '?')}"
        for e in edges
    ]

    # Try LLM
    llm_result = explain_component_llm(component_label, all_labels, edge_desc)
    if llm_result:
        return {
            "component": component_label,
            "what_it_does": llm_result.get("what_it_does", ""),
            "why_used": llm_result.get("why_used", ""),
            "alternatives": llm_result.get("alternatives", []),
            "best_practices": llm_result.get("best_practices", []),
            "common_mistakes": llm_result.get("common_mistakes", []),
        }

    # Heuristic fallback
    matched = _match_component(component_label)
    if matched and matched in COMPONENT_KNOWLEDGE:
        kb = COMPONENT_KNOWLEDGE[matched]
        return {"component": component_label, **kb}

    # Generic fallback
    return {
        "component": component_label,
        "what_it_does": f"{component_label} is a component in this architecture. Configure an LLM provider for a detailed explanation.",
        "why_used": "This component serves a specific purpose in the overall system design.",
        "alternatives": [{"name": "Various options", "trade_off": "Enable an LLM provider for specific alternatives"}],
        "best_practices": ["Follow the principle of least privilege", "Monitor and log all operations", "Document the component's role"],
        "common_mistakes": ["Under-provisioning resources", "Skipping monitoring", "Not planning for failure"],
    }


def explain_architecture(
    nodes: list[dict],
    edges: list[dict],
) -> dict[str, Any]:
    """Generate a full architecture walkthrough explaining all components."""
    labels = node_labels(nodes)
    components = []
    for node in nodes:
        explanation = explain_component(node["id"], nodes, edges)
        components.append(explanation)

    connections = []
    for edge in edges:
        src = labels.get(edge.get("source", ""), "?")
        tgt = labels.get(edge.get("target", ""), "?")
        connections.append({
            "source": src,
            "target": tgt,
            "explanation": f"{src} sends requests/data to {tgt}",
        })

    return {
        "title": "Architecture Walkthrough",
        "summary": f"This architecture consists of {len(nodes)} components and {len(edges)} connections.",
        "components": components,
        "connections": connections,
    }
