import { useMutation, useQueryClient } from "@tanstack/react-query";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { qk } from "@/lib/queryKeys";
import type { ExportFormat } from "@/lib/api";

export function useCreateAnalysis() {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (body: Parameters<typeof api.createAnalysis>[0]) => api.createAnalysis(body),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.analyses() }),
  });
}

export function usePostChat(analysisId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (message: string) => api.postChat(analysisId, message),
    onSuccess: () => qc.invalidateQueries({ queryKey: qk.chat(analysisId) }),
  });
}

export function useInviteMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ email, role }: { email: string; role: string }) =>
      api.inviteMember(workspaceId, email, role),
    onSuccess: (_, { email }) => {
      toast.success(`Invited ${email}`);
      qc.invalidateQueries({ queryKey: qk.workspaceMembers(workspaceId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useUpdateMemberRole(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateMemberRole(workspaceId, memberId, role),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: qk.workspaceMembers(workspaceId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useRemoveMember(workspaceId: string) {
  const qc = useQueryClient();
  return useMutation({
    mutationFn: (memberId: string) => api.removeMember(workspaceId, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: qk.workspaceMembers(workspaceId) });
      qc.invalidateQueries({ queryKey: qk.workspace(workspaceId) });
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useCreateShareLink() {
  return useMutation({
    mutationFn: (analysisId: string) => api.createShareLink(analysisId),
    onSuccess: (link) => {
      const url = `${window.location.origin}${link.url}`;
      navigator.clipboard.writeText(url).then(() => toast.success("Share link copied"));
    },
    onError: (e: Error) => toast.error(e.message),
  });
}

export function useDownloadExport() {
  return useMutation({
    mutationFn: ({ id, fmt, name }: { id: string; fmt: ExportFormat; name: string }) =>
      api.downloadExport(id, fmt, name),
    onSuccess: (_, { fmt }) => toast.success(`Downloaded ${fmt.toUpperCase()}`),
    onError: () => toast.error("Export failed"),
  });
}
