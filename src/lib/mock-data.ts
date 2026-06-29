// Shared mock data for the ArchMind AI platform.
// Replace these mocks with real data from the FastAPI/Supabase backend.

export type Severity = "low" | "medium" | "high" | "critical";
export type AgentStatus = "pending" | "running" | "completed" | "failed";

export type AgentKey =
  | "scalability"
  | "security"
  | "reliability"
  | "performance"
  | "cost"
  | "maintainability"
  | "observability";

export const AGENTS: Array<{
  key: AgentKey;
  name: string;
  description: string;
  accent: string;
  icon: string;
}> = [
  { key: "scalability", name: "Scalability Agent", description: "Evaluates horizontal scaling, bottlenecks, and capacity headroom.", accent: "from-sky-500 to-cyan-400", icon: "TrendingUp" },
  { key: "security", name: "Security Agent", description: "Audits authn/z, network exposure, secrets, and threat surface.", accent: "from-rose-500 to-orange-400", icon: "ShieldCheck" },
  { key: "reliability", name: "Reliability Agent", description: "Checks failure modes, redundancy, SLOs, and recovery strategy.", accent: "from-emerald-500 to-teal-400", icon: "HeartPulse" },
  { key: "performance", name: "Performance Agent", description: "Analyzes latency, caching, query patterns, and hot paths.", accent: "from-violet-500 to-indigo-400", icon: "Gauge" },
  { key: "cost", name: "Cost Agent", description: "Estimates infra spend, idle waste, and right-sizing opportunities.", accent: "from-amber-500 to-yellow-400", icon: "DollarSign" },
  { key: "maintainability", name: "Maintainability Agent", description: "Reviews modularity, coupling, ownership, and developer ergonomics.", accent: "from-fuchsia-500 to-pink-400", icon: "Wrench" },
  { key: "observability", name: "Observability Agent", description: "Inspects logs, metrics, traces, and alerting coverage.", accent: "from-blue-500 to-indigo-500", icon: "Activity" },
];

export type Analysis = {
  id: string;
  name: string;
  type: string;
  uploadedAt: string;
  status: "queued" | "analyzing" | "ready" | "failed";
  scores: Record<AgentKey, number>;
  workspace: string;
  author: string;
};

export const MOCK_ANALYSES: Analysis[] = [
  {
    id: "an_01",
    name: "Checkout v3 — Event Driven",
    type: "Excalidraw",
    uploadedAt: "2026-06-27T10:14:00Z",
    status: "ready",
    workspace: "Platform",
    author: "Alex Chen",
    scores: { scalability: 86, security: 72, reliability: 81, performance: 78, cost: 64, maintainability: 74, observability: 69 },
  },
  {
    id: "an_02",
    name: "Realtime Inference Pipeline",
    type: "Mermaid",
    uploadedAt: "2026-06-26T09:02:00Z",
    status: "ready",
    workspace: "AI",
    author: "Priya Patel",
    scores: { scalability: 92, security: 65, reliability: 70, performance: 88, cost: 55, maintainability: 68, observability: 76 },
  },
  {
    id: "an_03",
    name: "Multi-region Postgres HA",
    type: "Draw.io",
    uploadedAt: "2026-06-24T16:48:00Z",
    status: "ready",
    workspace: "Infra",
    author: "Jordan Diaz",
    scores: { scalability: 78, security: 84, reliability: 90, performance: 72, cost: 60, maintainability: 70, observability: 82 },
  },
  {
    id: "an_04",
    name: "Public API Gateway",
    type: "PlantUML",
    uploadedAt: "2026-06-22T12:00:00Z",
    status: "analyzing",
    workspace: "Platform",
    author: "Sam Lee",
    scores: { scalability: 0, security: 0, reliability: 0, performance: 0, cost: 0, maintainability: 0, observability: 0 },
  },
];

export type Finding = {
  id: string;
  agent: AgentKey;
  title: string;
  severity: Severity;
  summary: string;
  recommendation: string;
  node?: string;
};

export const MOCK_FINDINGS: Finding[] = [
  { id: "f1", agent: "security", severity: "high", title: "Public S3 bucket reachable from CDN", summary: "Origin allows unsigned GETs and is referenced in the diagram as 'assets-prod'.", recommendation: "Require signed URLs at the CDN and enable bucket policy denying public ACLs.", node: "n-cdn" },
  { id: "f2", agent: "scalability", severity: "medium", title: "Single-AZ Redis dependency", summary: "Cache is in one availability zone, fronted by a stateless API tier that scales horizontally.", recommendation: "Move to ElastiCache Multi-AZ with automatic failover and warm replicas.", node: "n-cache" },
  { id: "f3", agent: "reliability", severity: "critical", title: "Missing dead-letter queue", summary: "Order processor consumes from SQS but failed messages are dropped after 3 retries.", recommendation: "Add a DLQ and an alarm on DLQ depth > 0 with on-call routing.", node: "n-orders" },
  { id: "f4", agent: "cost", severity: "low", title: "Over-provisioned worker nodes", summary: "Worker pool runs at ~22% CPU on average across the last 30 days.", recommendation: "Drop to a smaller instance family or enable cluster autoscaler aggressive scale-in.", node: "n-workers" },
  { id: "f5", agent: "observability", severity: "medium", title: "No distributed tracing across service boundary", summary: "Trace context is dropped between the API gateway and the order service.", recommendation: "Propagate W3C traceparent headers and instrument with OpenTelemetry SDK.", node: "n-api" },
  { id: "f6", agent: "performance", severity: "medium", title: "N+1 query on order history", summary: "Each order fetches line items individually instead of joining.", recommendation: "Batch with a single JOIN, or use DataLoader pattern at the resolver level.", node: "n-orders" },
];

export const SEVERITY_META: Record<Severity, { label: string; color: string }> = {
  low: { label: "Low", color: "text-muted-foreground bg-muted" },
  medium: { label: "Medium", color: "text-warning bg-warning/10" },
  high: { label: "High", color: "text-orange-400 bg-orange-500/10" },
  critical: { label: "Critical", color: "text-danger bg-danger/10" },
};

export function scoreColor(score: number) {
  if (score >= 80) return "text-success";
  if (score >= 65) return "text-warning";
  return "text-danger";
}

export function overallScore(scores: Record<AgentKey, number>) {
  const vals = Object.values(scores).filter((v) => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
