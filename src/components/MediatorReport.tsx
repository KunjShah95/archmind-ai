import { AlertTriangle, CheckCircle, Info } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import { Card, CardContent } from "@/components/ui/card";
import { ScoreRing } from "@/components/ScoreRing";
import { AGENTS, scoreColor } from "@/lib/types";
import type { MediatorReport as MediatorReportType } from "@/lib/types";
import { SEVERITY_META } from "@/lib/types";

function confidenceMeta(confidence: number) {
  if (confidence >= 0.85) return { label: "High", color: "bg-success/10 text-success border-success/20" };
  if (confidence >= 0.7) return { label: "Medium", color: "bg-warning/10 text-warning border-warning/20" };
  return { label: "Low", color: "bg-danger/10 text-danger border-danger/20" };
}

function severityBadge(s: string) {
  const meta = SEVERITY_META[s as keyof typeof SEVERITY_META];
  return meta ?? { label: s, color: "text-muted-foreground bg-muted" };
}

export function MediatorReport({ report }: { report: MediatorReportType }) {
  return (
    <div className="space-y-4">
      <div className="flex items-center gap-4 p-4 rounded-lg border bg-background/40">
        <ScoreRing value={report.final_score} size={72} label="Consolidated" />
        <div>
          <h3 className="font-display font-semibold text-sm">Consolidated Architecture Score</h3>
          <p className="text-xs text-muted-foreground mt-1">
            Aggregate score across all agents with mediated adjustments
          </p>
        </div>
      </div>

      <div>
        <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
          Per-Agent Scores
        </h4>
        <div className="grid grid-cols-4 gap-2">
          {AGENTS.map((agent) => {
            const score = report.score_by_agent[agent.key] ?? 0;
            return (
              <div key={agent.key} className="flex flex-col items-center gap-1 p-2 rounded-lg border bg-card">
                <ScoreRing value={score} size={40} />
                <span className="text-[10px] text-muted-foreground truncate w-full text-center leading-tight">
                  {agent.name.replace(" Agent", "")}
                </span>
              </div>
            );
          })}
        </div>
      </div>

      {report.consolidated_findings.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Consolidated Findings
          </h4>
          <div className="space-y-3">
            {report.consolidated_findings.map((f, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-2">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className={`text-[10px] px-1.5 py-0.5 rounded ${severityBadge(f.severity).color}`}>
                      <AlertTriangle className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                      {severityBadge(f.severity).label}
                    </span>
                    <span className={`text-[10px] px-1.5 py-0.5 rounded border ${confidenceMeta(f.confidence).color}`}>
                      <CheckCircle className="h-3 w-3 inline mr-0.5 -mt-0.5" />
                      {confidenceMeta(f.confidence).label} Confidence
                    </span>
                    <span className="text-[10px] text-muted-foreground ml-auto">
                      {(f.confidence * 100).toFixed(0)}%
                    </span>
                  </div>

                  <p className="text-sm font-medium leading-snug">{f.finding}</p>

                  <div className="flex flex-wrap gap-1.5 text-[10px]">
                    <span className="text-muted-foreground">Flagged by:</span>
                    {f.agents_flagged.map((k) => {
                      const a = AGENTS.find((ag) => ag.key === k);
                      return (
                        <Badge key={k} variant="secondary" className="text-[10px] px-1.5 py-0 h-4">
                          {a?.name.replace(" Agent", "") ?? k}
                        </Badge>
                      );
                    })}
                    {f.agents_disagree && f.agents_disagree.length > 0 && (
                      <>
                        <span className="text-muted-foreground ml-1">Disagrees:</span>
                        {f.agents_disagree.map((k) => {
                          const a = AGENTS.find((ag) => ag.key === k);
                          return (
                            <Badge key={k} variant="destructive" className="text-[10px] px-1.5 py-0 h-4">
                              {a?.name.replace(" Agent", "") ?? k}
                            </Badge>
                          );
                        })}
                      </>
                    )}
                  </div>

                  {f.trade_off && (
                    <div className="flex items-start gap-1.5 text-xs text-muted-foreground">
                      <Info className="h-3.5 w-3.5 mt-0.5 shrink-0 text-primary" />
                      <span>{f.trade_off}</span>
                    </div>
                  )}

                  <div className="rounded-md bg-primary/5 border border-primary/15 p-2 text-xs leading-relaxed">
                    <span className="font-medium text-primary">Fix:</span> {f.recommendation}
                  </div>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}

      {report.top_tensions.length > 0 && (
        <div>
          <h4 className="text-xs font-semibold uppercase tracking-wider text-muted-foreground mb-3">
            Top Tensions
          </h4>
          <div className="space-y-2">
            {report.top_tensions.map((t, i) => (
              <Card key={i}>
                <CardContent className="p-3 space-y-1.5">
                  <div className="flex items-center gap-2 text-sm font-medium">
                    <AlertTriangle className="h-3.5 w-3.5 text-warning" />
                    <span>
                      {t.between.map((k) => AGENTS.find((a) => a.key === k)?.name.replace(" Agent", "") ?? k).join(" vs ")}
                    </span>
                  </div>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Topic:</span> {t.topic}
                  </p>
                  <p className="text-xs text-muted-foreground">
                    <span className="font-medium text-foreground">Resolution:</span> {t.resolution}
                  </p>
                </CardContent>
              </Card>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
