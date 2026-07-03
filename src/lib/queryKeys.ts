export const qk = {
  // Auth
  me: () => ["me"] as const,
  dashboardStats: () => ["dashboard-stats"] as const,

  // Analyses
  analyses: (q?: string) => ["analyses", q ?? ""] as const,
  analysis: (id: string) => ["analysis", id] as const,
  agentReport: (id: string, agent: string) => ["analysis", id, "agent", agent] as const,
  chat: (id: string) => ["chat", id] as const,
  audit: (id: string) => ["audit", id] as const,
  versions: (id: string) => ["versions", id] as const,
  shared: (token: string) => ["shared", token] as const,

  // Workspaces
  workspaces: () => ["workspaces"] as const,
  workspace: (id: string) => ["workspace", id] as const,
  workspaceMembers: (id: string) => ["workspace-members", id] as const,
  workspaceActivity: (id: string) => ["workspace-activity", id] as const,
};
