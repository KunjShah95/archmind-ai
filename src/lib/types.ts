// Shared types for ArchMind AI

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

export function overallScore(scores: Record<string, number>) {
  const vals = Object.values(scores).filter((v) => v > 0);
  if (!vals.length) return 0;
  return Math.round(vals.reduce((a, b) => a + b, 0) / vals.length);
}
