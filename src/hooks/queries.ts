import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";

export function useMe() {
  return useQuery({ queryKey: qk.me(), queryFn: () => api.me() });
}

export function useDashboardStats() {
  return useQuery({ queryKey: qk.dashboardStats(), queryFn: () => api.dashboardStats() });
}

export function useAnalyses(q?: string) {
  return useQuery({ queryKey: qk.analyses(q), queryFn: () => api.listAnalyses(q), staleTime: 10_000 });
}

export function useAnalysis(id: string | undefined) {
  return useQuery({
    queryKey: qk.analysis(id ?? ""),
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
    refetchInterval: (q) =>
      q.state.data?.status === "analyzing" || q.state.data?.status === "queued" ? 2000 : false,
  });
}

export function useAgentReport(analysisId: string | undefined, agentKey: string | undefined) {
  return useQuery({
    queryKey: qk.agentReport(analysisId ?? "", agentKey ?? ""),
    queryFn: () => api.getAgentReport(analysisId!, agentKey!),
    enabled: Boolean(analysisId) && Boolean(agentKey),
  });
}

export function useChat(analysisId: string | undefined) {
  return useQuery({
    queryKey: qk.chat(analysisId ?? ""),
    queryFn: () => api.getChat(analysisId!),
    enabled: Boolean(analysisId),
  });
}

export function useWorkspaces() {
  return useQuery({ queryKey: qk.workspaces(), queryFn: () => api.listWorkspaces() });
}

export function useWorkspace(id: string | undefined) {
  return useQuery({
    queryKey: qk.workspace(id ?? ""),
    queryFn: () => api.getWorkspace(id!),
    enabled: Boolean(id),
  });
}

export function useWorkspaceMembers(workspaceId: string | undefined) {
  return useQuery({
    queryKey: qk.workspaceMembers(workspaceId ?? ""),
    queryFn: () => api.listMembers(workspaceId!),
    enabled: Boolean(workspaceId),
  });
}

export function useWorkspaceActivity(workspaceId: string | undefined) {
  return useQuery({
    queryKey: qk.workspaceActivity(workspaceId ?? ""),
    queryFn: () => api.getWorkspaceActivity(workspaceId!),
    enabled: Boolean(workspaceId),
    refetchInterval: 30_000,
  });
}

export function useAuditTrail(analysisId: string | undefined) {
  return useQuery({
    queryKey: qk.audit(analysisId ?? ""),
    queryFn: () => api.getAuditTrail(analysisId!),
    enabled: Boolean(analysisId),
  });
}

export function useVersionHistory(analysisId: string | undefined) {
  return useQuery({
    queryKey: qk.versions(analysisId ?? ""),
    queryFn: () => api.getVersionHistory(analysisId!),
    enabled: Boolean(analysisId),
  });
}

export function useSharedAnalysis(token: string | undefined) {
  return useQuery({
    queryKey: qk.shared(token ?? ""),
    queryFn: () => api.getSharedAnalysis(token!),
    enabled: Boolean(token),
    retry: false,
  });
}
