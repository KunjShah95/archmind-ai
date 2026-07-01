"""AI Architecture Generator — converts natural-language prompts into complete architecture designs.

Generates: Mermaid diagram, tech stack, database choices, API design, queue system,
CDN strategy, Kubernetes manifest, and Terraform starter.

Uses LLM with structured prompts; falls back to template-based generation
when no LLM provider is available.
"""

import json
import re
from typing import Any

from app.services.llm import llm_complete, _extract_json
from app.services.diagram import parse_mermaid, _layout


# ── LLM-based generation ──────────────────────────────────────────────

_GENERATOR_SYSTEM = (
    "You are a world-class solutions architect. Given a system description, "
    "produce a complete architecture design. Respond ONLY with valid JSON, no prose.\n\n"
    "Required JSON structure:\n"
    "{\n"
    '  "diagram_mermaid": "graph TD\\n  ...",\n'
    '  "tech_stack": {"frontend": "...", "backend": "...", "database": "...", "cache": "...", "queue": "...", "cdn": "...", "monitoring": "..."},\n'
    '  "database_choices": [{"name": "...", "purpose": "...", "rationale": "..."}],\n'
    '  "api_design": {"gateway": "...", "auth": "...", "rate_limiting": "...", "protocols": ["REST", "gRPC"]},\n'
    '  "queue_system": {"technology": "...", "use_cases": ["..."], "rationale": "..."},\n'
    '  "cdn_strategy": {"provider": "...", "cache_rules": "...", "rationale": "..."},\n'
    '  "kubernetes_manifest": "apiVersion: ...",\n'
    '  "terraform_starter": "provider \\"aws\\" { ... }"\n'
    "}"
)


def _build_generation_prompt(
    prompt: str,
    target_users: str | None = None,
    cloud_provider: str | None = None,
    constraints: dict[str, Any] | None = None,
) -> str:
    parts = [f"Design a production-ready architecture for:\n{prompt}"]
    if target_users:
        parts.append(f"Target scale: {target_users} users")
    if cloud_provider:
        parts.append(f"Cloud provider: {cloud_provider}")
    if constraints:
        parts.append(f"Constraints: {json.dumps(constraints)}")
    parts.append(
        "\nInclude: load balancers, caching, queues, databases, CDN, monitoring, CI/CD. "
        "The Mermaid diagram should use `graph TD` with descriptive node labels. "
        "The Kubernetes manifest should be a basic deployment + service. "
        "The Terraform should be a starter with provider, VPC, and core resources."
    )
    return "\n".join(parts)


def generate_architecture_llm(
    prompt: str,
    target_users: str | None = None,
    cloud_provider: str | None = None,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any] | None:
    """Try LLM-based architecture generation. Returns None if no provider answers."""
    user_prompt = _build_generation_prompt(prompt, target_users, cloud_provider, constraints)
    result = llm_complete(_GENERATOR_SYSTEM, user_prompt)
    if not result:
        return None
    data = _extract_json(result)
    if not data or "diagram_mermaid" not in data:
        return None
    return data


# ── Template-based fallback ───────────────────────────────────────────

_TEMPLATES: dict[str, dict[str, Any]] = {
    "ecommerce": {
        "diagram_mermaid": (
            "graph TD\n"
            "  Client[Web / Mobile Client] --> CDN[CloudFront CDN]\n"
            "  CDN --> LB[Application Load Balancer]\n"
            "  LB --> API[API Gateway]\n"
            "  API --> Auth[Auth Service / Cognito]\n"
            "  API --> ProductSvc[Product Service]\n"
            "  API --> OrderSvc[Order Service]\n"
            "  API --> PaymentSvc[Payment Service]\n"
            "  API --> SearchSvc[Search Service / Elasticsearch]\n"
            "  OrderSvc --> Queue[SQS / Kafka Queue]\n"
            "  Queue --> Workers[Order Workers]\n"
            "  ProductSvc --> DB[(PostgreSQL Primary)]\n"
            "  OrderSvc --> DB\n"
            "  DB --> Replica[(PostgreSQL Replica)]\n"
            "  ProductSvc --> Cache[(Redis Cluster)]\n"
            "  OrderSvc --> Cache\n"
            "  Workers --> Notifications[Notification Service]\n"
            "  Notifications --> Email[SES / SendGrid]\n"
            "  API --> Monitor[Prometheus + Grafana]\n"
        ),
        "tech_stack": {
            "frontend": "Next.js / React with SSR",
            "backend": "Node.js / FastAPI microservices",
            "database": "PostgreSQL (primary + read replica)",
            "cache": "Redis Cluster (multi-AZ)",
            "queue": "Amazon SQS or Apache Kafka",
            "cdn": "CloudFront with S3 origin",
            "monitoring": "Prometheus + Grafana + OpenTelemetry",
        },
        "database_choices": [
            {"name": "PostgreSQL", "purpose": "Primary relational store", "rationale": "ACID compliance, JSON support, proven at scale"},
            {"name": "Redis", "purpose": "Session cache + product catalog cache", "rationale": "Sub-millisecond reads, pub/sub for invalidation"},
            {"name": "Elasticsearch", "purpose": "Product search + faceted filtering", "rationale": "Full-text search with relevance scoring"},
        ],
        "api_design": {
            "gateway": "Kong / AWS API Gateway",
            "auth": "JWT with refresh tokens via OAuth 2.0",
            "rate_limiting": "100 req/s per user, 1000 req/s per API key",
            "protocols": ["REST", "WebSocket for real-time"],
        },
        "queue_system": {
            "technology": "Apache Kafka / Amazon SQS",
            "use_cases": ["Order processing", "Inventory sync", "Email notifications", "Analytics events"],
            "rationale": "Decouples write-heavy order path from synchronous request flow",
        },
        "cdn_strategy": {
            "provider": "CloudFront",
            "cache_rules": "Static assets: 30d TTL, API responses: no-cache, Images: 7d TTL with versioned URLs",
            "rationale": "Reduces origin load by 80%+ for static content, improves global latency",
        },
    },
    "saas": {
        "diagram_mermaid": (
            "graph TD\n"
            "  Client[SPA Client] --> CDN[CDN / Cloudflare]\n"
            "  CDN --> LB[Load Balancer]\n"
            "  LB --> API[API Service]\n"
            "  API --> Auth[Auth0 / Cognito]\n"
            "  API --> Core[Core Service]\n"
            "  API --> Billing[Billing Service / Stripe]\n"
            "  Core --> DB[(PostgreSQL)]\n"
            "  Core --> Cache[(Redis)]\n"
            "  Core --> Queue[Job Queue / BullMQ]\n"
            "  Queue --> Workers[Background Workers]\n"
            "  Workers --> Storage[S3 / GCS Storage]\n"
            "  API --> Monitor[Datadog / Grafana]\n"
        ),
        "tech_stack": {
            "frontend": "React + TypeScript SPA",
            "backend": "Node.js / Go API",
            "database": "PostgreSQL with connection pooling",
            "cache": "Redis",
            "queue": "BullMQ / Redis Streams",
            "cdn": "Cloudflare",
            "monitoring": "Datadog APM + Sentry",
        },
        "database_choices": [
            {"name": "PostgreSQL", "purpose": "Multi-tenant data store", "rationale": "Row-level security, schema-per-tenant support"},
            {"name": "Redis", "purpose": "Cache + job queue backend", "rationale": "Fast key-value with built-in queue primitives"},
        ],
        "api_design": {
            "gateway": "Cloudflare Workers / Express middleware",
            "auth": "Auth0 with RBAC and API keys",
            "rate_limiting": "Tiered by plan (free: 10 req/s, pro: 100 req/s)",
            "protocols": ["REST", "Webhooks"],
        },
        "queue_system": {
            "technology": "BullMQ (Redis-backed)",
            "use_cases": ["PDF generation", "Email sending", "Data export", "Webhook delivery"],
            "rationale": "Lightweight, built on existing Redis infra, reliable retry semantics",
        },
        "cdn_strategy": {
            "provider": "Cloudflare",
            "cache_rules": "SPA shell: 1h TTL, API: bypass, Assets: immutable with content hashing",
            "rationale": "Global edge network with DDoS protection included",
        },
    },
    "generic": {
        "diagram_mermaid": (
            "graph TD\n"
            "  Client[Client Apps] --> LB[Load Balancer]\n"
            "  LB --> API[API Service]\n"
            "  API --> Auth[Auth Service]\n"
            "  API --> Core[Core Service]\n"
            "  Core --> DB[(Database)]\n"
            "  Core --> Cache[(Cache)]\n"
            "  Core --> Queue[Message Queue]\n"
            "  Queue --> Workers[Workers]\n"
            "  API --> Monitor[Monitoring]\n"
        ),
        "tech_stack": {
            "frontend": "React / Next.js",
            "backend": "Python FastAPI / Node.js",
            "database": "PostgreSQL",
            "cache": "Redis",
            "queue": "RabbitMQ / SQS",
            "cdn": "CloudFront / Cloudflare",
            "monitoring": "Prometheus + Grafana",
        },
        "database_choices": [
            {"name": "PostgreSQL", "purpose": "Primary data store", "rationale": "Reliable, scalable, extensive ecosystem"},
            {"name": "Redis", "purpose": "Caching layer", "rationale": "In-memory speed for hot data"},
        ],
        "api_design": {
            "gateway": "Nginx / API Gateway",
            "auth": "JWT + OAuth 2.0",
            "rate_limiting": "50 req/s default",
            "protocols": ["REST"],
        },
        "queue_system": {
            "technology": "RabbitMQ",
            "use_cases": ["Async processing", "Event distribution"],
            "rationale": "Mature, well-understood, supports complex routing",
        },
        "cdn_strategy": {
            "provider": "Cloudflare",
            "cache_rules": "Static: long TTL, Dynamic: pass-through",
            "rationale": "Simple setup with global coverage",
        },
    },
}

_K8S_TEMPLATE = """apiVersion: apps/v1
kind: Deployment
metadata:
  name: {name}-api
  labels:
    app: {name}
spec:
  replicas: 3
  selector:
    matchLabels:
      app: {name}
  template:
    metadata:
      labels:
        app: {name}
    spec:
      containers:
      - name: api
        image: {name}-api:latest
        ports:
        - containerPort: 8000
        resources:
          requests:
            cpu: "250m"
            memory: "256Mi"
          limits:
            cpu: "1000m"
            memory: "512Mi"
        livenessProbe:
          httpGet:
            path: /health
            port: 8000
          initialDelaySeconds: 10
        readinessProbe:
          httpGet:
            path: /ready
            port: 8000
          initialDelaySeconds: 5
---
apiVersion: v1
kind: Service
metadata:
  name: {name}-api
spec:
  type: LoadBalancer
  ports:
  - port: 80
    targetPort: 8000
  selector:
    app: {name}
---
apiVersion: autoscaling/v2
kind: HorizontalPodAutoscaler
metadata:
  name: {name}-api-hpa
spec:
  scaleTargetRef:
    apiVersion: apps/v1
    kind: Deployment
    name: {name}-api
  minReplicas: 2
  maxReplicas: 20
  metrics:
  - type: Resource
    resource:
      name: cpu
      target:
        type: Utilization
        averageUtilization: 70
"""

_TF_TEMPLATE = """# Terraform starter for {name}
# Provider: {provider}

terraform {{
  required_version = ">= 1.5"
  required_providers {{
    aws = {{
      source  = "hashicorp/aws"
      version = "~> 5.0"
    }}
  }}
}}

provider "aws" {{
  region = var.region
}}

variable "region" {{
  default = "us-east-1"
}}

variable "environment" {{
  default = "production"
}}

# VPC
module "vpc" {{
  source  = "terraform-aws-modules/vpc/aws"
  version = "~> 5.0"

  name = "{name}-vpc"
  cidr = "10.0.0.0/16"

  azs             = ["${{var.region}}a", "${{var.region}}b", "${{var.region}}c"]
  private_subnets = ["10.0.1.0/24", "10.0.2.0/24", "10.0.3.0/24"]
  public_subnets  = ["10.0.101.0/24", "10.0.102.0/24", "10.0.103.0/24"]

  enable_nat_gateway = true
  single_nat_gateway = false

  tags = {{
    Environment = var.environment
    Project     = "{name}"
  }}
}}

# ECS Cluster (for containerized services)
resource "aws_ecs_cluster" "main" {{
  name = "{name}-cluster"

  setting {{
    name  = "containerInsights"
    value = "enabled"
  }}
}}

# RDS PostgreSQL
module "rds" {{
  source  = "terraform-aws-modules/rds/aws"
  version = "~> 6.0"

  identifier = "{name}-db"

  engine         = "postgres"
  engine_version = "16"
  instance_class = "db.r6g.large"

  allocated_storage     = 100
  max_allocated_storage = 500

  db_name  = "{name_clean}"
  username = "admin"

  multi_az               = true
  db_subnet_group_name   = module.vpc.database_subnet_group_name
  vpc_security_group_ids = [aws_security_group.rds.id]

  backup_retention_period = 7
  deletion_protection     = true
}}

# ElastiCache Redis
resource "aws_elasticache_cluster" "cache" {{
  cluster_id           = "{name}-cache"
  engine               = "redis"
  node_type            = "cache.r6g.large"
  num_cache_nodes      = 1
  parameter_group_name = "default.redis7"
}}

# Security Group for RDS
resource "aws_security_group" "rds" {{
  name_prefix = "{name}-rds-"
  vpc_id      = module.vpc.vpc_id

  ingress {{
    from_port       = 5432
    to_port         = 5432
    protocol        = "tcp"
    security_groups = []  # Add your app security group
  }}
}}
"""


def _detect_template(prompt: str) -> str:
    """Pick the best matching template based on keywords."""
    lower = prompt.lower()
    if any(kw in lower for kw in ["ecommerce", "e-commerce", "shop", "store", "marketplace", "cart", "checkout", "product"]):
        return "ecommerce"
    if any(kw in lower for kw in ["saas", "subscription", "multi-tenant", "b2b", "platform"]):
        return "saas"
    return "generic"


def _sanitize_name(prompt: str) -> str:
    """Extract a short slug from the prompt for template placeholders."""
    words = re.sub(r"[^a-zA-Z0-9\s]", "", prompt).lower().split()[:3]
    return "-".join(words) if words else "app"


def generate_architecture_heuristic(
    prompt: str,
    target_users: str | None = None,
    cloud_provider: str | None = None,
) -> dict[str, Any]:
    """Template-based fallback when no LLM provider is available."""
    template_key = _detect_template(prompt)
    template = _TEMPLATES[template_key].copy()
    name = _sanitize_name(prompt)
    name_clean = name.replace("-", "_")
    provider = cloud_provider or "aws"

    template["kubernetes_manifest"] = _K8S_TEMPLATE.format(name=name)
    template["terraform_starter"] = _TF_TEMPLATE.format(
        name=name, name_clean=name_clean, provider=provider,
    )
    return template


def generate_architecture(
    prompt: str,
    target_users: str | None = None,
    cloud_provider: str | None = None,
    constraints: dict[str, Any] | None = None,
) -> dict[str, Any]:
    """Generate a complete architecture, preferring LLM with heuristic fallback."""
    result = generate_architecture_llm(prompt, target_users, cloud_provider, constraints)
    if result:
        # Ensure K8s and Terraform are present even from LLM
        name = _sanitize_name(prompt)
        if not result.get("kubernetes_manifest"):
            result["kubernetes_manifest"] = _K8S_TEMPLATE.format(name=name)
        if not result.get("terraform_starter"):
            result["terraform_starter"] = _TF_TEMPLATE.format(
                name=name, name_clean=name.replace("-", "_"),
                provider=cloud_provider or "aws",
            )
        return result
    return generate_architecture_heuristic(prompt, target_users, cloud_provider)


def architecture_to_graph(arch: dict[str, Any]) -> tuple[list[dict], list[dict]]:
    """Parse the generated Mermaid diagram into nodes/edges for the pipeline."""
    mermaid = arch.get("diagram_mermaid", "")
    if mermaid:
        nodes, edges = parse_mermaid(mermaid)
        if nodes:
            return nodes, edges
    # Fallback: build from tech stack keys
    from app.services.diagram import DEFAULT_NODES, DEFAULT_EDGES
    return DEFAULT_NODES, DEFAULT_EDGES
