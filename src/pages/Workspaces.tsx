import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings as Cog } from "lucide-react";
import { api } from "@/lib/api";
import { toast } from "sonner";

export default function Workspaces() {
  const { data: workspaces = [], isLoading } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.listWorkspaces(),
  });
  const primary = workspaces[0];
  const { data: members = [] } = useQuery({
    queryKey: ["workspace-members", primary?.id],
    queryFn: () => api.listMembers(primary!.id),
    enabled: Boolean(primary?.id),
  });

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Workspaces"
        description="Organize analyses by team and control who can do what."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => toast.info("Workspace creation coming in Team plan")}>
            <Plus className="h-4 w-4 mr-1.5" /> New workspace
          </Button>
        }
      />

      {isLoading && <p className="text-sm text-muted-foreground">Loading workspaces…</p>}

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {workspaces.map((w) => (
          <div key={w.id} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center font-semibold text-primary-foreground">
                  {w.name[0]}
                </div>
                <div>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-muted-foreground capitalize">{w.plan} plan</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Cog className="h-4 w-4" /></Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-lg font-display font-semibold">{w.member_count}</div>
                <div className="text-[11px] text-muted-foreground">Members</div>
              </div>
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-lg font-display font-semibold">{w.analysis_count}</div>
                <div className="text-[11px] text-muted-foreground">Analyses</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      {primary && (
        <div className="rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 className="font-display font-semibold">Members — {primary.name}</h3>
              <p className="text-xs text-muted-foreground">Manage roles and access</p>
            </div>
            <Button size="sm" variant="outline" onClick={() => toast.info("Invites coming soon")}>
              <Plus className="h-3.5 w-3.5 mr-1.5" /> Invite
            </Button>
          </div>
          <div className="divide-y divide-border">
            {members.map((m) => (
              <div key={m.id} className="flex items-center gap-4 p-4">
                <Avatar className="h-9 w-9">
                  <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">
                    {(m.full_name || m.email).slice(0, 2).toUpperCase()}
                  </AvatarFallback>
                </Avatar>
                <div className="min-w-0 flex-1">
                  <div className="text-sm font-medium">{m.full_name ?? m.email}</div>
                  <div className="text-xs text-muted-foreground">{m.email}</div>
                </div>
                <Badge variant="outline" className="capitalize">{m.role}</Badge>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
