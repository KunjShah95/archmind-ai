import { getStoredToken, setStoredToken } from "./supabase";
import type { AgentKey } from "./types";

const API_BASE = import.meta.env.VITE_API_URL ?? "";

export class ApiError extends Error {
  constructor(
    message: string,
    public status: number,
  ) {
    super(message);
  }
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

  const res = await fetch(`${API_BASE}${path}`, { ...options, headers });
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

  exportUrl: (id: string, fmt: ExportFormat) => {
    const token = getStoredToken();
    return `${API_BASE}/api/analyses/${id}/export/${fmt}${token ? `?token=${token}` : ""}`;
  },

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
};

export { setStoredToken };
