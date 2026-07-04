import { useState } from "react";
import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Users, Plus, Trash2, Shield, Activity, ArrowLeft, Loader2, Crown, Edit2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import {
  Dialog, DialogContent, DialogHeader, DialogTitle, DialogTrigger,
} from "@/components/ui/dialog";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import {
  AlertDialog, AlertDialogAction, AlertDialogCancel, AlertDialogContent,
  AlertDialogDescription, AlertDialogFooter, AlertDialogHeader, AlertDialogTitle,
  AlertDialogTrigger,
} from "@/components/ui/alert-dialog";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { cn } from "@/lib/utils";

const ROLE_META: Record<string, { label: string; color: string; icon: typeof Crown }> = {
  owner: { label: "Owner", color: "text-yellow-400 border-yellow-400/30 bg-yellow-400/10", icon: Crown },
  editor: { label: "Editor", color: "text-blue-400 border-blue-400/30 bg-blue-400/10", icon: Edit2 },
  viewer: { label: "Viewer", color: "text-muted-foreground border-border bg-muted/40", icon: Shield },
};

export default function WorkspaceDetail() {
  const { wsId } = useParams<{ wsId: string }>();
  const navigate = useNavigate();
  const qc = useQueryClient();

  const [inviteEmail, setInviteEmail] = useState("");
  const [inviteRole, setInviteRole] = useState("editor");
  const [inviteOpen, setInviteOpen] = useState(false);

  const { data: workspace, isLoading: wsLoading } = useQuery({
    queryKey: ["workspace", wsId],
    queryFn: () => api.getWorkspace(wsId!),
    enabled: Boolean(wsId),
  });

  const { data: members = [], isLoading: membersLoading } = useQuery({
    queryKey: ["workspace-members", wsId],
    queryFn: () => api.listMembers(wsId!),
    enabled: Boolean(wsId),
  });

  const inviteMutation = useMutation({
    mutationFn: () => api.inviteMember(wsId!, inviteEmail, inviteRole),
    onSuccess: () => {
      toast.success(`Invited ${inviteEmail}`);
      qc.invalidateQueries({ queryKey: ["workspace-members", wsId] });
      setInviteEmail("");
      setInviteOpen(false);
    },
    onError: (e: any) => toast.error(e.message),
  });

  const updateRoleMutation = useMutation({
    mutationFn: ({ memberId, role }: { memberId: string; role: string }) =>
      api.updateMemberRole(wsId!, memberId, role),
    onSuccess: () => {
      toast.success("Role updated");
      qc.invalidateQueries({ queryKey: ["workspace-members", wsId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  const removeMutation = useMutation({
    mutationFn: (memberId: string) => api.removeMember(wsId!, memberId),
    onSuccess: () => {
      toast.success("Member removed");
      qc.invalidateQueries({ queryKey: ["workspace-members", wsId] });
    },
    onError: (e: any) => toast.error(e.message),
  });

  if (wsLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  if (!workspace) {
    return (
      <div className="p-8 text-center text-muted-foreground">
        Workspace not found.{" "}
        <Button variant="link" onClick={() => navigate("/workspaces")}>Back to workspaces</Button>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate("/workspaces")}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title={workspace.name}
          description={`${workspace.plan} plan · ${workspace.member_count} members · ${workspace.analysis_count} analyses`}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" asChild>
                <Link to={`/workspaces/${wsId}/activity`}>
                  <Activity className="h-3.5 w-3.5 mr-1.5" /> Activity
                </Link>
              </Button>
              <Dialog open={inviteOpen} onOpenChange={setInviteOpen}>
                <DialogTrigger asChild>
                  <button
                    className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all"
                    style={{ background: "hsl(16 76% 52%)" }}
                    onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
                    onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                  >
                    <Plus className="h-3.5 w-3.5" /> Invite member
                  </button>
                </DialogTrigger>
                <DialogContent>
                  <DialogHeader>
                    <DialogTitle>Invite to {workspace.name}</DialogTitle>
                  </DialogHeader>
                  <div className="space-y-4 pt-2">
                    <div className="space-y-1.5">
                      <Label>Email address</Label>
                      <Input
                        placeholder="colleague@company.com"
                        value={inviteEmail}
                        onChange={(e) => setInviteEmail(e.target.value)}
                        onKeyDown={(e) => e.key === "Enter" && inviteMutation.mutate()}
                      />
                    </div>
                    <div className="space-y-1.5">
                      <Label>Role</Label>
                      <Select value={inviteRole} onValueChange={setInviteRole}>
                        <SelectTrigger>
                          <SelectValue />
                        </SelectTrigger>
                        <SelectContent>
                          <SelectItem value="editor">Editor — can create and analyze</SelectItem>
                          <SelectItem value="viewer">Viewer — read-only access</SelectItem>
                        </SelectContent>
                      </Select>
                    </div>
                    <Button
                      className="w-full"
                      onClick={() => inviteMutation.mutate()}
                      disabled={!inviteEmail || inviteMutation.isPending}
                    >
                      {inviteMutation.isPending ? <Loader2 className="h-4 w-4 animate-spin mr-2" /> : null}
                      Send invite
                    </Button>
                  </div>
                </DialogContent>
              </Dialog>
            </div>
          }
        />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div className="flex items-center gap-2">
            <Users className="h-4 w-4 text-muted-foreground" />
            <span className="font-display font-semibold">Members</span>
            <Badge variant="secondary">{members.length}</Badge>
          </div>
        </div>

        {membersLoading ? (
          <div className="flex items-center justify-center py-16">
            <Loader2 className="h-5 w-5 animate-spin text-muted-foreground" />
          </div>
        ) : (
          <div className="divide-y divide-border">
            {members.map((m) => {
              const meta = ROLE_META[m.role] ?? ROLE_META.viewer;
              const RoleIcon = meta.icon;
              return (
                <div key={m.id} className="flex items-center gap-4 p-4">
                  <Avatar className="h-9 w-9 shrink-0">
                    <AvatarFallback className="text-xs font-bold text-white" style={{ background: "hsl(16 76% 52%)" }}>
                      {(m.full_name || m.email).slice(0, 2).toUpperCase()}
                    </AvatarFallback>
                  </Avatar>
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{m.full_name ?? m.email}</div>
                    <div className="text-xs text-muted-foreground truncate">{m.email}</div>
                  </div>
                  <div className="flex items-center gap-2">
                    <Select
                      value={m.role}
                      onValueChange={(role) => updateRoleMutation.mutate({ memberId: m.id, role })}
                    >
                      <SelectTrigger className={cn("h-7 text-xs border gap-1.5 w-auto", meta.color)}>
                        <RoleIcon className="h-3 w-3" />
                        <SelectValue />
                      </SelectTrigger>
                      <SelectContent>
                        <SelectItem value="owner">Owner</SelectItem>
                        <SelectItem value="editor">Editor</SelectItem>
                        <SelectItem value="viewer">Viewer</SelectItem>
                      </SelectContent>
                    </Select>
                    <AlertDialog>
                      <AlertDialogTrigger asChild>
                        <Button variant="ghost" size="icon" className="h-7 w-7 text-muted-foreground hover:text-destructive">
                          <Trash2 className="h-3.5 w-3.5" />
                        </Button>
                      </AlertDialogTrigger>
                      <AlertDialogContent>
                        <AlertDialogHeader>
                          <AlertDialogTitle>Remove member?</AlertDialogTitle>
                          <AlertDialogDescription>
                            {m.full_name ?? m.email} will lose access to this workspace immediately.
                          </AlertDialogDescription>
                        </AlertDialogHeader>
                        <AlertDialogFooter>
                          <AlertDialogCancel>Cancel</AlertDialogCancel>
                          <AlertDialogAction
                            className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
                            onClick={() => removeMutation.mutate(m.id)}
                          >
                            Remove
                          </AlertDialogAction>
                        </AlertDialogFooter>
                      </AlertDialogContent>
                    </AlertDialog>
                  </div>
                </div>
              );
            })}
          </div>
        )}
      </div>
    </div>
  );
}
