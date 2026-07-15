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

// Dev uses the Vite proxy (/api -> localhost:8000), so keep same-origin ("").
// In production, fall back to the deployed backend when VITE_API_URL is unset,
// otherwise API calls hit the static SPA host and fail with "cannot reach server".
const API_BASE =
  import.meta.env.VITE_API_URL ||
  (import.meta.env.PROD ? "https://archmind-ai.onrender.com" : "");

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
}

// Render free tier cold-starts take ~40s after idle. 15s aborted every first
// request. 60s tolerates the wake-up so retries aren't needed to reach a warm server.
const REQUEST_TIMEOUT_MS = 60_000;

function getCsrfToken(): string | null {
  const match = document.cookie.match(/(?:^|;\s*)archmind_csrf=([^;]+)/);
  return match ? decodeURIComponent(match[1]) : null;
}

async function request<T>(path: string, options: RequestInit = {}): Promise<T> {
  const token = getStoredToken();
  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };
  if (token) headers.Authorization = `Bearer ${token}`;
  if (!(options.body instanceof FormData)) {
    headers["Content-Type"] = headers["Content-Type"] || "application/json";
  }
  const method = (options.method || "GET").toUpperCase();
  if (["POST", "PUT", "PATCH", "DELETE"].includes(method)) {
    const csrf = getCsrfToken();
    if (csrf) headers["X-CSRF-Token"] = csrf;
  }

  let res: Response;
  try {
    res = await fetch(`${API_BASE}${path}`, {
      ...options,
      headers,
      credentials: "include",
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

export type AuditEvent = {
  id: string;
  actor: string;
  actor_email: string;
  action: string;
  entity_type: string;
  entity_id: string;
  metadata: Record<string, string> | null;
  created_at: string;
};

export type AnalysisVersion = {
  id: string;
  version_no: number;
  change_type: string;
  summary: string;
  author: string;
  author_id: string;
  created_at: string;
  scores: Record<string, number>;
};

export type ShareLink = {
  token: string;
  url: string;
  scope: string;
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
  // Best-effort ping to wake the (Render free-tier) backend while the user is
  // still on the landing/login page, so the first real request isn't a cold start.
  warmup: (): void => {
    void fetch(`${API_BASE}/api/health`, {
      method: "GET",
      cache: "no-store",
      signal: AbortSignal.timeout(REQUEST_TIMEOUT_MS),
    }).catch(() => {});
  },

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
      credentials: "include",
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

  getWorkspace: (workspaceId: string) =>
    request<Workspace>(`/api/workspaces/${workspaceId}`),

  listMembers: (workspaceId: string) =>
    request<WorkspaceMember[]>(`/api/workspaces/${workspaceId}/members`),

  inviteMember: (workspaceId: string, email: string, role: string) =>
    request<{ status: string; email: string; role: string }>(`/api/workspaces/${workspaceId}/invites`, {
      method: "POST",
      body: JSON.stringify({ email, role }),
    }),

  updateMemberRole: (workspaceId: string, memberId: string, role: string) =>
    request<{ status: string; role: string }>(`/api/workspaces/${workspaceId}/members/${memberId}`, {
      method: "PATCH",
      body: JSON.stringify({ role }),
    }),

  removeMember: (workspaceId: string, memberId: string) =>
    request<void>(`/api/workspaces/${workspaceId}/members/${memberId}`, { method: "DELETE" }),

  getWorkspaceActivity: (workspaceId: string) =>
    request<AuditEvent[]>(`/api/workspaces/${workspaceId}/activity`),

  getAuditTrail: (analysisId: string) =>
    request<AuditEvent[]>(`/api/analyses/${analysisId}/audit`),

  getVersionHistory: (analysisId: string) =>
    request<AnalysisVersion[]>(`/api/analyses/${analysisId}/versions`),

  createShareLink: (analysisId: string) =>
    request<ShareLink>(`/api/analyses/${analysisId}/share`, { method: "POST" }),

  getSharedAnalysis: (token: string) =>
    request<AnalysisDetail>(`/api/analyses/shared/${token}`),

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

  exchangeSession: (token: string) =>
    request<{ status: string }>("/api/auth/session", {
      method: "POST",
      body: JSON.stringify({ token }),
    }),

  sessionLogout: () =>
    request<{ status: string }>("/api/auth/logout", { method: "POST" }),
};

export { setStoredToken };



