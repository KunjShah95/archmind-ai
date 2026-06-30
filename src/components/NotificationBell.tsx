import { useMemo, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Bell, CheckCircle2, Loader2, AlertTriangle, Clock } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { api, type Analysis } from "@/lib/api";

const SEEN_KEY = "archmind_seen_notifications";

function loadSeen(): Set<string> {
  try {
    return new Set(JSON.parse(localStorage.getItem(SEEN_KEY) || "[]"));
  } catch {
    return new Set();
  }
}

function notifFor(a: Analysis): { icon: typeof Bell; text: string; actionable: boolean } {
  switch (a.status) {
    case "ready":
      return { icon: CheckCircle2, text: `Analysis ready: ${a.name}`, actionable: true };
    case "failed":
      return { icon: AlertTriangle, text: `Analysis failed: ${a.name}`, actionable: true };
    case "analyzing":
      return { icon: Loader2, text: `Analyzing: ${a.name}`, actionable: false };
    default:
      return { icon: Clock, text: `Queued: ${a.name}`, actionable: false };
  }
}

export function NotificationBell() {
  const navigate = useNavigate();
  const [seen, setSeen] = useState<Set<string>>(loadSeen);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses", "notifications"],
    queryFn: () => api.listAnalyses(),
    refetchInterval: 30_000,
  });

  const items = useMemo(
    () =>
      [...analyses]
        .sort((a, b) => +new Date(b.uploaded_at) - +new Date(a.uploaded_at))
        .slice(0, 8),
    [analyses],
  );

  const unreadCount = items.filter(
    (a) => notifFor(a).actionable && !seen.has(`${a.id}:${a.status}`),
  ).length;

  const markAllSeen = () => {
    const ids = items.map((a) => `${a.id}:${a.status}`);
    const next = new Set([...seen, ...ids]);
    setSeen(next);
    localStorage.setItem(SEEN_KEY, JSON.stringify([...next]));
  };

  return (
    <DropdownMenu onOpenChange={(open) => open && markAllSeen()}>
      <DropdownMenuTrigger asChild>
        <Button size="icon" variant="ghost" className="h-9 w-9 relative" aria-label="Notifications">
          <Bell className="h-4 w-4" />
          {unreadCount > 0 && (
            <span className="absolute top-1 right-1 min-w-[15px] h-[15px] px-1 rounded-full bg-primary text-[9px] font-semibold text-primary-foreground grid place-items-center">
              {unreadCount > 9 ? "9+" : unreadCount}
            </span>
          )}
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end" className="w-80">
        <DropdownMenuLabel className="flex items-center justify-between">
          <span>Notifications</span>
          {unreadCount > 0 && (
            <span className="text-xs font-normal text-muted-foreground">{unreadCount} new</span>
          )}
        </DropdownMenuLabel>
        <DropdownMenuSeparator />
        {items.length === 0 && (
          <div className="px-2 py-6 text-center text-sm text-muted-foreground">
            No notifications yet.
          </div>
        )}
        {items.map((a) => {
          const { icon: Icon, text } = notifFor(a);
          return (
            <DropdownMenuItem
              key={a.id}
              className="gap-2 items-start py-2"
              onClick={() => navigate(`/analyses/${a.id}`)}
            >
              <Icon className={`h-4 w-4 mt-0.5 shrink-0 ${a.status === "analyzing" ? "animate-spin" : ""}`} />
              <div className="min-w-0">
                <div className="text-sm truncate">{text}</div>
                <div className="text-[11px] text-muted-foreground">
                  {new Date(a.uploaded_at).toLocaleString()}
                </div>
              </div>
            </DropdownMenuItem>
          );
        })}
        {items.length > 0 && (
          <>
            <DropdownMenuSeparator />
            <DropdownMenuItem onClick={() => navigate("/analyses")} className="justify-center text-sm text-primary">
              View all analyses
            </DropdownMenuItem>
          </>
        )}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
