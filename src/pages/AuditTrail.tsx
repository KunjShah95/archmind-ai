import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, ShieldCheck, FilePlus, CheckCircle, AlertCircle,
  Search, Filter,
} from "lucide-react";
import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { api } from "@/lib/api";
import type { AuditEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; icon: typeof FilePlus; color: string }> = {
  "analysis.created": { label: "Analysis created", icon: FilePlus, color: "text-blue-400" },
  "analysis.completed": { label: "Analysis completed", icon: CheckCircle, color: "text-green-400" },
  "analysis.failed": { label: "Analysis failed", icon: AlertCircle, color: "text-red-400" },
  "finding.created": { label: "Finding detected", icon: AlertCircle, color: "text-yellow-400" },
};

function EventRow({ event }: { event: AuditEvent }) {
  const meta = ACTION_META[event.action] ?? { label: event.action, icon: ShieldCheck, color: "text-muted-foreground" };
  const Icon = meta.icon;
  const date = new Date(event.created_at);
  const isAI = event.actor_email === "ai@archmind.io";

  return (
    <tr className="border-b border-border hover:bg-muted/20 transition-colors">
      <td className="py-3 px-4">
        <div className="flex items-center gap-2">
          <Avatar className="h-6 w-6 shrink-0">
            <AvatarFallback
              className={cn("text-[9px] font-bold", isAI ? "bg-primary/20 text-primary" : "text-white")}
              style={isAI ? undefined : { background: "hsl(16 76% 52%)" }}
            >
              {event.actor.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm">{event.actor}</span>
          {isAI && <Badge variant="outline" className="text-[10px] py-0 h-4">AI</Badge>}
        </div>
      </td>
      <td className="py-3 px-4">
        <div className="flex items-center gap-1.5">
          <Icon className={cn("h-3.5 w-3.5 shrink-0", meta.color)} />
          <span className="text-sm text-muted-foreground">{meta.label}</span>
        </div>
      </td>
      <td className="py-3 px-4">
        <Badge variant="outline" className="text-xs capitalize">{event.entity_type}</Badge>
      </td>
      <td className="py-3 px-4">
        {event.metadata && Object.keys(event.metadata).length > 0 ? (
          <div className="text-xs text-muted-foreground max-w-[200px] truncate">
            {Object.entries(event.metadata).map(([k, v]) => `${k}: ${v}`).join(", ")}
          </div>
        ) : (
          <span className="text-xs text-muted-foreground/40">—</span>
        )}
      </td>
      <td className="py-3 px-4 text-xs text-muted-foreground whitespace-nowrap">
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </td>
    </tr>
  );
}

export default function AuditTrail() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [search, setSearch] = useState("");

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["audit", id],
    queryFn: () => api.getAuditTrail(id!),
    enabled: Boolean(id),
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
  });

  const filtered = events.filter((e) =>
    !search ||
    e.actor.toLowerCase().includes(search.toLowerCase()) ||
    e.action.toLowerCase().includes(search.toLowerCase()) ||
    (e.metadata?.name ?? "").toLowerCase().includes(search.toLowerCase())
  );

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/analyses/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Audit Trail"
          description={analysis ? `Activity log for "${analysis.name}"` : "Full history of actions and changes"}
        />
      </div>

      <div className="flex items-center gap-3">
        <div className="relative flex-1 max-w-sm">
          <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
          <Input
            placeholder="Search events…"
            className="pl-8 h-9"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
          />
        </div>
        <Badge variant="secondary">{filtered.length} events</Badge>
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : filtered.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <ShieldCheck className="h-8 w-8 opacity-30" />
            <p className="text-sm">{search ? "No matching events" : "No audit events yet"}</p>
          </div>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border bg-muted/30">
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Actor</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Action</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Entity</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Details</th>
                  <th className="text-left py-2.5 px-4 text-xs font-medium text-muted-foreground">Timestamp</th>
                </tr>
              </thead>
              <tbody>
                {filtered.map((event) => (
                  <EventRow key={event.id} event={event} />
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}
