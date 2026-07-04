import { useParams, useNavigate, Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, FilePlus, CheckCircle, AlertCircle, UserPlus, Sparkles,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import type { AuditEvent } from "@/lib/api";
import { cn } from "@/lib/utils";

const ACTION_META: Record<string, { label: string; icon: typeof FilePlus; color: string }> = {
  "analysis.created": { label: "Created analysis", icon: FilePlus, color: "text-blue-400 bg-blue-400/10" },
  "analysis.completed": { label: "Analysis completed", icon: CheckCircle, color: "text-green-400 bg-green-400/10" },
  "analysis.failed": { label: "Analysis failed", icon: AlertCircle, color: "text-red-400 bg-red-400/10" },
  "finding.created": { label: "Finding added", icon: AlertCircle, color: "text-yellow-400 bg-yellow-400/10" },
  "member.invited": { label: "Member invited", icon: UserPlus, color: "text-purple-400 bg-purple-400/10" },
  "member.removed": { label: "Member removed", icon: UserPlus, color: "text-muted-foreground bg-muted/40" },
};

function EventRow({ event }: { event: AuditEvent }) {
  const meta = ACTION_META[event.action] ?? { label: event.action, icon: Sparkles, color: "text-muted-foreground bg-muted/40" };
  const Icon = meta.icon;
  const date = new Date(event.created_at);

  return (
    <div className="flex items-start gap-4 py-4">
      <div className={cn("h-8 w-8 rounded-full flex items-center justify-center shrink-0 mt-0.5", meta.color)}>
        <Icon className="h-4 w-4" />
      </div>
      <div className="flex-1 min-w-0">
        <div className="flex items-center gap-2 flex-wrap">
          <Avatar className="h-5 w-5 shrink-0">
            <AvatarFallback className="text-[9px] font-bold text-white" style={{ background: "hsl(16 76% 52%)" }}>
              {event.actor.slice(0, 2).toUpperCase()}
            </AvatarFallback>
          </Avatar>
          <span className="text-sm font-medium">{event.actor}</span>
          <span className="text-sm text-muted-foreground">{meta.label}</span>
          {event.metadata?.name && (
            <Badge variant="secondary" className="text-xs font-normal max-w-[200px] truncate">
              {event.metadata.name}
            </Badge>
          )}
        </div>
        {event.entity_type === "analysis" && event.action === "analysis.created" && (
          <Link
            to={`/analyses/${event.entity_id}`}
            className="text-xs text-primary hover:underline mt-0.5 inline-block"
          >
            View analysis →
          </Link>
        )}
      </div>
      <time className="text-xs text-muted-foreground shrink-0 mt-1" dateTime={event.created_at}>
        {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
      </time>
    </div>
  );
}

export default function ActivityFeed() {
  const { wsId } = useParams<{ wsId: string }>();
  const navigate = useNavigate();

  const { data: events = [], isLoading } = useQuery({
    queryKey: ["workspace-activity", wsId],
    queryFn: () => api.getWorkspaceActivity(wsId!),
    enabled: Boolean(wsId),
    refetchInterval: 30_000,
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/workspaces/${wsId}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Activity Feed"
          description="Recent actions across this workspace"
        />
      </div>

      <div className="rounded-xl border border-border bg-card">
        {isLoading ? (
          <div className="flex items-center justify-center py-20">
            <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
          </div>
        ) : events.length === 0 ? (
          <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
            <Sparkles className="h-8 w-8 opacity-30" />
            <p className="text-sm">No activity yet</p>
          </div>
        ) : (
          <div className="divide-y divide-border px-5">
            {events.map((event) => (
              <EventRow key={event.id} event={event} />
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
