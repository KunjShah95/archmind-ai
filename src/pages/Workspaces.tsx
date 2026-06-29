import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { Plus, Settings as Cog } from "lucide-react";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";

const WORKSPACES = [
  { name: "Platform", members: 12, analyses: 38, plan: "Team" },
  { name: "AI", members: 8, analyses: 21, plan: "Team" },
  { name: "Infra", members: 5, analyses: 14, plan: "Hobby" },
];

const MEMBERS = [
  { name: "Alex Chen", email: "alex@archmind.ai", role: "Owner", initials: "AC" },
  { name: "Priya Patel", email: "priya@archmind.ai", role: "Admin", initials: "PP" },
  { name: "Jordan Diaz", email: "jordan@archmind.ai", role: "Editor", initials: "JD" },
  { name: "Sam Lee", email: "sam@archmind.ai", role: "Viewer", initials: "SL" },
];

export default function Workspaces() {
  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Workspaces"
        description="Organize analyses by team and control who can do what."
        actions={
          <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Plus className="h-4 w-4 mr-1.5" /> New workspace
          </Button>
        }
      />

      <div className="grid md:grid-cols-3 gap-4 mb-8">
        {WORKSPACES.map((w) => (
          <div key={w.name} className="rounded-xl border border-border bg-card p-5">
            <div className="flex items-center justify-between">
              <div className="flex items-center gap-3">
                <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center font-semibold text-primary-foreground">
                  {w.name[0]}
                </div>
                <div>
                  <div className="font-medium">{w.name}</div>
                  <div className="text-xs text-muted-foreground">{w.plan} plan</div>
                </div>
              </div>
              <Button variant="ghost" size="icon" className="h-7 w-7"><Cog className="h-4 w-4" /></Button>
            </div>
            <div className="mt-4 grid grid-cols-2 gap-2 text-center">
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-lg font-display font-semibold">{w.members}</div>
                <div className="text-[11px] text-muted-foreground">Members</div>
              </div>
              <div className="rounded-md bg-muted/40 py-2">
                <div className="text-lg font-display font-semibold">{w.analyses}</div>
                <div className="text-[11px] text-muted-foreground">Analyses</div>
              </div>
            </div>
          </div>
        ))}
      </div>

      <div className="rounded-xl border border-border bg-card">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display font-semibold">Members — Platform</h3>
            <p className="text-xs text-muted-foreground">Manage roles and access</p>
          </div>
          <Button size="sm" variant="outline"><Plus className="h-3.5 w-3.5 mr-1.5" /> Invite</Button>
        </div>
        <div className="divide-y divide-border">
          {MEMBERS.map((m) => (
            <div key={m.email} className="flex items-center gap-4 p-4">
              <Avatar className="h-9 w-9">
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{m.initials}</AvatarFallback>
              </Avatar>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium">{m.name}</div>
                <div className="text-xs text-muted-foreground">{m.email}</div>
              </div>
              <Select defaultValue={m.role}>
                <SelectTrigger className="w-32 h-9"><SelectValue /></SelectTrigger>
                <SelectContent>
                  {["Owner", "Admin", "Editor", "Viewer"].map((r) => <SelectItem key={r} value={r}>{r}</SelectItem>)}
                </SelectContent>
              </Select>
            </div>
          ))}
        </div>
      </div>
    </div>
  );
}
