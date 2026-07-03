import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, GitBranch, CheckCircle, Sparkles, Clock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { api } from "@/lib/api";
import { AGENTS, overallScore, scoreColor } from "@/lib/types";
import { cn } from "@/lib/utils";

const CHANGE_META: Record<string, { label: string; color: string }> = {
  initial: { label: "Created", color: "bg-blue-500" },
  analysis_complete: { label: "Analyzed", color: "bg-green-500" },
  finding_updated: { label: "Finding updated", color: "bg-yellow-500" },
  score_updated: { label: "Score updated", color: "bg-purple-500" },
};

export default function VersionHistory() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const { data: versions = [], isLoading } = useQuery({
    queryKey: ["versions", id],
    queryFn: () => api.getVersionHistory(id!),
    enabled: Boolean(id),
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
  });

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/analyses/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Version History"
          description={analysis?.name ?? "Analysis versions and change log"}
        />
      </div>

      {isLoading ? (
        <div className="flex items-center justify-center h-48">
          <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
        </div>
      ) : versions.length === 0 ? (
        <div className="flex flex-col items-center justify-center py-20 text-muted-foreground gap-3">
          <GitBranch className="h-8 w-8 opacity-30" />
          <p className="text-sm">No version history available</p>
        </div>
      ) : (
        <div className="relative">
          <div className="absolute left-5 top-0 bottom-0 w-px bg-border" />
          <div className="space-y-0">
            {versions.map((v, idx) => {
              const meta = CHANGE_META[v.change_type] ?? { label: v.change_type, color: "bg-muted-foreground" };
              const overall = overallScore(v.scores);
              const date = new Date(v.created_at);
              return (
                <div key={v.id} className="relative flex gap-6 pb-8">
                  <div className={cn("h-10 w-10 rounded-full flex items-center justify-center shrink-0 z-10 border-2 border-background", meta.color)}>
                    {v.change_type === "initial" ? (
                      <Sparkles className="h-4 w-4 text-white" />
                    ) : (
                      <CheckCircle className="h-4 w-4 text-white" />
                    )}
                  </div>
                  <div className="flex-1 rounded-xl border border-border bg-card p-4 hover:border-primary/30 transition-colors">
                    <div className="flex items-start justify-between gap-3 flex-wrap">
                      <div>
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge variant="outline" className="text-xs">v{v.version_no}</Badge>
                          <Badge className={cn("text-xs text-white border-0", meta.color)}>{meta.label}</Badge>
                          {idx === 0 && <Badge variant="secondary" className="text-xs">Latest</Badge>}
                        </div>
                        <p className="text-sm mt-1.5">{v.summary}</p>
                        <div className="flex items-center gap-3 mt-2 text-xs text-muted-foreground">
                          <span>{v.author}</span>
                          <span className="flex items-center gap-1">
                            <Clock className="h-3 w-3" />
                            {date.toLocaleDateString()} {date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })}
                          </span>
                        </div>
                      </div>
                      {overall > 0 && (
                        <div className={cn("text-2xl font-display font-bold tabular-nums", scoreColor(overall))}>
                          {overall}
                        </div>
                      )}
                    </div>
                    {Object.keys(v.scores).length > 0 && (
                      <div className="mt-3 flex flex-wrap gap-2">
                        {AGENTS.filter((a) => v.scores[a.key] !== undefined).map((a) => (
                          <div key={a.key} className="flex items-center gap-1.5 text-xs">
                            <span className="text-muted-foreground">{a.name}:</span>
                            <span className={cn("font-medium", scoreColor(v.scores[a.key]))}>{v.scores[a.key]}</span>
                          </div>
                        ))}
                      </div>
                    )}
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      )}
    </div>
  );
}
