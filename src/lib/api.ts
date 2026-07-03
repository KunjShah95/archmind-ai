import { getStoredToken, setStoredToken } from "./supabase";
import type {
  AgentKey,
  RedesignResult,
  RedesignStrategy,
  ComponentExplanation,
  ArchitectureWalkthrough,
  GeneratedArtifacts,
  MediatorReport,
  SimulationResult,
  ChaosResult,
  NodeImpact,
  DebateResult,
  BenchmarkResult
} from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

const REQUEST_TIMEOUT_MS = 15_000;

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      cache: "no-store",
      signal: options.signal ?? AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    });
  } catch (e) {
    if (e instanceof DOMException && (e.name === "TimeoutError" || e.name === "AbortError")) {
      throw new ApiError("Server is not responding. Please try again in a moment.", 408);
    }
    throw new ApiError("Cannot reach the server. Check your connection and try again.", 0);
  }
  if (!res.ok) {
    const err = await res.json().catch(() => ({ detail: res.statusText }));
    throw new ApiError(err.detail || "Request failed", res.status);
  }
  if (res.status === 204) return undefined as T;
  return res.json();
}

export type Profile = {
  id: string;
  email: string;
  full_name: string | null;
  plan: string;
  analyses_used: number;
  analyses_limit: number;
};

export type Analysis = {
  id: string;
  name: string;
  diagram_type: string | null;
  status: "queued" | "analyzing" | "ready" | "failed";
  scores: Record<AgentKey, number>;
  workspace: string;
  workspace_id: string;
  author: string;
  author_id: string;
  uploaded_at: string;
};

export type AnalysisDetail = Analysis & {
  source_type: string;
  diagram_nodes: Array<{ id: string; position: { x: number; y: number }; data: { label: string } }>;
  diagram_edges: Array<{ id: string; source: string; target: string }>;
  findings: Finding[];
  analysis_mode?: string;
  generation_prompt?: string | null;
  generated_artifacts?: GeneratedArtifacts | null;
  mediator_report?: MediatorReport | null;
};

export type Finding = {
  id: string;
  agent: AgentKey;
  severity: "low" | "medium" | "high" | "critical";
  title: string;
  summary: string;
  recommendation: string;
  node_id?: string | null;
};

export type DashboardStats = {
  total_analyses: number;
  avg_score: number;
  critical_findings: number;
  resolved_findings: number;
  analyses_used: number;
  analyses_limit: number;
  plan: string;
};

export type Workspace = {
  id: string;
  name: string;
  slug: string;
  plan: string;
  member_count: number;
  analysis_count: number;
};

export type WorkspaceMember = {
  id: string;
  user_id: string;
  email: string;
  full_name: string | null;
  role: string;
};

export type ChatMessage = {
  id: string;
  role: "user" | "assistant";
  content: string;
  created_at: string;
};

export type AgentMeta = {
  key: string;
  name: string;
  description: string;
  accent: string;
  icon: string;
};

export type AgentReport = {
  agent_key: string;
  agent_name: string;
  agent_description: string;
  agent_accent: string;
  score: number;
  findings: Finding[];
  analysis_name: string;
  analysis_id: string;
  node_count: number;
  edge_count: number;
  diagram_type: string | null;
};

export type ExportFormat = "json" | "markdown" | "html" | "csv" | "pdf";

export const api = {
  demoLogin: (email: string, password: string, full_name?: string) =>
    request<{ access_token: string; user: Profile }>("/api/auth/demo-login", {
      method: "POST",
      body: JSON.stringify({ email, password, full_name }),
    }),

  me: () => request<Profile>("/api/auth/me"),

  dashboardStats: () => request<DashboardStats>("/api/dashboard/stats"),

  listAnalyses: (q?: string) =>
    request<Analysis[]>(`/api/analyses${q ? `?q=${encodeURIComponent(q)}` : ""}`),

  getAnalysis: (id: string) => request<AnalysisDetail>(`/api/analyses/${id}`),

  createAnalysis: (body: {
    name: string;
    workspace_id?: string;
    source_type: string;
    source_content?: string;
    diagram_type?: string;
  }) =>
    request<Analysis>("/api/analyses", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  uploadAnalysis: (form: FormData) =>
    request<Analysis>("/api/analyses/upload", { method: "POST", body: form }),

  getChat: (id: string) => request<ChatMessage[]>(`/api/analyses/${id}/chat`),

  postChat: (id: string, message: string) =>
    request<ChatMessage>(`/api/analyses/${id}/chat`, {
      method: "POST",
      body: JSON.stringify({ message }),
    }),

  downloadExport: async (id: string, fmt: ExportFormat, filename: string) => {
    const token = getStoredToken();
    const res = await fetch(`${API_BASE}/api/analyses/${id}/export/${fmt}`, {
      headers: token ? { Authorization: `Bearer ${token}` } : {},
    });
    if (!res.ok) throw new ApiError("Export failed", res.status);
    const blob = await res.blob();
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${filename}.${fmt === "markdown" ? "md" : fmt}`;
    a.click();
    URL.revokeObjectURL(url);
  },

  getAgentMeta: () => request<AgentMeta[]>("/api/analyses/agents/meta"),

  getAgentReport: (analysisId: string, agentKey: string) =>
    request<AgentReport>(`/api/analyses/${analysisId}/agents/${agentKey}`),

  listWorkspaces: () => request<Workspace[]>("/api/workspaces"),

  listMembers: (workspaceId: string) =>
    request<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),

  // ── Phase 1: Generator ──

  generateArchitecture: (body: {
    prompt: string;
    target_users?: string;
    cloud_provider?: string;
    constraints?: Record<string, any>;
  }) =>
    request<Analysis>("/api/analyses/generate", {
      method: "POST",
      body: JSON.stringify(body),
    }),

  // ── Phase 1: Redesign ──

  getRedesignStrategies: () =>
    request<RedesignStrategy[]>("/api/analyses/redesign/strategies"),

  redesignArchitecture: (analysisId: string, strategy: string) =>
    request<RedesignResult>(`/api/analyses/${analysisId}/redesign`, {
      method: "POST",
      body: JSON.stringify({ strategy }),
    }),

  // ── Phase 1: Learning Mode ──

  getArchitectureWalkthrough: (analysisId: string) =>
    request<ArchitectureWalkthrough>(`/api/analyses/${analysisId}/learn`),

  getComponentExplanation: (analysisId: string, nodeId: string) =>
    request<ComponentExplanation>(`/api/analyses/${analysisId}/learn/${encodeURIComponent(nodeId)}`),

  // ── Phase 2: Traffic Simulation ──

  simulateTraffic: (analysisId: string) =>
    request<SimulationResult>(`/api/analyses/${analysisId}/simulate`, {
      method: "POST",
    }),

  // ── Phase 2: Failure Simulator ──

  simulateFailure: (analysisId: string, failedNodeId: string) =>
    request<ChaosResult>(`/api/analyses/${analysisId}/chaos`, {
      method: "POST",
      body: JSON.stringify({ failed_node_id: failedNodeId }),
    }),

  // ── Phase 2: Knowledge Graph ──

  getNodeDependencies: (analysisId: string, nodeId: string) =>
    request<any>(`/api/analyses/${analysisId}/graph/dependencies/${encodeURIComponent(nodeId)}`),

  getGraphImpactMatrix: (analysisId: string) =>
    request<NodeImpact[]>(`/api/analyses/${analysisId}/graph/impact`),

  // ── Phase 2: Multi-Agent Debate ──

  runMultiAgentDebate: (analysisId: string, topic: string) =>
    request<DebateResult>(`/api/analyses/${analysisId}/debate`, {
      method: "POST",
      body: JSON.stringify({ topic }),
    }),

  // ── Phase 2: Architecture Benchmarks ──

  runArchitectureBenchmark: (analysisId: string) =>
    request<BenchmarkResult>(`/api/analyses/${analysisId}/benchmark`, {
      method: "POST",
    }),

  // ── Phase 3: CI/CD Webhook Review ──

  githubPrWebhook: (payload: any) =>
    request<any>("/api/analyses/integrations/webhook/github", {
      method: "POST",
      body: JSON.stringify(payload),
    }),

  // ── Phase 4: Live Cloud Integration ──

  scanCloudDrift: (analysisId: string, provider: string) =>
    request<any>(`/api/analyses/${analysisId}/cloud/scan?provider=${provider}`, {
      method: "POST",
    }),

  // ── Phase 4: FinOps Cost Optimization ──

  getFinOpsAnalysis: (analysisId: string) =>
    request<any>(`/api/analyses/${analysisId}/finops`),

  // ── Phase 4: Compliance Audits ──

  getComplianceAudit: (analysisId: string) =>
    request<any>(`/api/analyses/${analysisId}/compliance`),

  // ── Docs Generator ──

  getGeneratedDoc: (analysisId: string, docType: "readme" | "adr") =>
    request<{ filename: string; markdown: string }>(
      `/api/analyses/${analysisId}/docs/${docType}`,
    ),

  // ── Executive Reports ──

  getExecutiveReport: (analysisId: string, audience: string) =>
    request<{ audience: string; audience_label: string; score: number; risk_level: string; markdown: string }>(
      `/api/analyses/${analysisId}/report/${audience}`,
    ),

  // ── Integrations: Slack & GitHub ──

  slackTest: (webhook_url: string) =>
    request<{ status: string }>("/api/integrations/slack/test", {
      method: "POST",
      body: JSON.stringify({ webhook_url }),
    }),

  slackNotify: (webhook_url: string, analysis_id: string) =>
    request<{ status: string }>("/api/integrations/slack/notify", {
      method: "POST",
      body: JSON.stringify({ webhook_url, analysis_id }),
    }),

  githubImport: (repo_url: string, workspace_id?: string) =>
    request<Analysis>("/api/integrations/github/import", {
      method: "POST",
      body: JSON.stringify({ repo_url, workspace_id }),
    }),

  // ── Phase 4: AI Pair Architect ──

  runPairArchitectSession: (body: {
    current_mermaid?: string | null;
    history: any[];
    new_message: string;
  }) =>
    request<any>("/api/analyses/pair-architect", {
      method: "POST",
      body: JSON.stringify(body),
    }),
};

export { setStoredToken };



