import { useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { Loader2, Lock, AlertTriangle, ExternalLink } from "lucide-react";
import { Logo } from "@/components/Logo";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ScoreRing";
import { Button } from "@/components/ui/button";
import { api } from "@/lib/api";
import { AGENTS, overallScore, scoreColor, SEVERITY_META } from "@/lib/types";
import { cn } from "@/lib/utils";

export default function SharedAnalysis() {
  const { token } = useParams<{ token: string }>();

  const { data: analysis, isLoading, isError } = useQuery({
    queryKey: ["shared", token],
    queryFn: () => api.getSharedAnalysis(token!),
    enabled: Boolean(token),
    retry: false,
  });

  return (
    <div className="min-h-screen bg-background text-foreground">
      <header className="border-b border-border px-6 py-3 flex items-center justify-between sticky top-0 bg-background/80 backdrop-blur-xl z-30">
        <Logo />
        <div className="flex items-center gap-3">
          <Badge variant="outline" className="gap-1.5">
            <Lock className="h-3 w-3" /> Read-only shared view
          </Badge>
          <Button size="sm" asChild>
            <a href="/signup">Sign up free</a>
          </Button>
        </div>
      </header>

      <main className="max-w-5xl mx-auto px-6 py-10">
        {isLoading && (
          <div className="flex items-center justify-center h-64 gap-3 text-muted-foreground">
            <Loader2 className="h-6 w-6 animate-spin" />
            <span>Loading shared analysis…</span>
          </div>
        )}

        {isError && (
          <div className="flex flex-col items-center justify-center h-64 gap-4 text-center">
            <AlertTriangle className="h-10 w-10 text-yellow-500" />
            <div>
              <h2 className="font-display font-semibold text-lg">Link not found or expired</h2>
              <p className="text-sm text-muted-foreground mt-1">This share link may have been revoked or doesn't exist.</p>
            </div>
            <Button variant="outline" asChild>
              <a href="/">Go to ArchMind <ExternalLink className="h-3.5 w-3.5 ml-1.5" /></a>
            </Button>
          </div>
        )}

        {analysis && (
          <div className="space-y-8">
            <div>
              <h1 className="text-2xl font-display font-bold">{analysis.name}</h1>
              <div className="flex items-center gap-3 mt-2 text-sm text-muted-foreground flex-wrap">
                <span>By {analysis.author}</span>
                <span>·</span>
                <span>{analysis.workspace}</span>
                {analysis.diagram_type && (
                  <>
                    <span>·</span>
                    <Badge variant="outline">{analysis.diagram_type}</Badge>
                  </>
                )}
              </div>
            </div>

            <div className="grid grid-cols-2 md:grid-cols-4 gap-4">
              {AGENTS.map((agent) => {
                const score = analysis.scores[agent.key] ?? 0;
                return (
                  <div key={agent.key} className="rounded-xl border border-border bg-card p-4 flex flex-col items-center gap-2">
                    <ScoreRing score={score} size={56} stroke={5} />
                    <div className="text-xs text-center text-muted-foreground">{agent.name}</div>
                  </div>
                );
              })}
            </div>

            {analysis.findings && analysis.findings.length > 0 && (
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="p-4 border-b border-border">
                  <h2 className="font-display font-semibold">Findings</h2>
                  <p className="text-xs text-muted-foreground mt-0.5">{analysis.findings.length} issues identified</p>
                </div>
                <div className="divide-y divide-border">
                  {analysis.findings.map((f) => {
                    const sev = SEVERITY_META[f.severity as keyof typeof SEVERITY_META];
                    return (
                      <div key={f.id} className="p-4 space-y-1">
                        <div className="flex items-center gap-2 flex-wrap">
                          <Badge className={cn("text-xs border-0", sev?.color)}>{f.severity}</Badge>
                          <span className="text-sm font-medium">{f.title}</span>
                          <Badge variant="outline" className="text-xs ml-auto capitalize">{f.agent}</Badge>
                        </div>
                        <p className="text-sm text-muted-foreground">{f.summary}</p>
                        <p className="text-xs text-muted-foreground/70">{f.recommendation}</p>
                      </div>
                    );
                  })}
                </div>
              </div>
            )}

            <div className="rounded-xl border border-border bg-gradient-to-br from-primary/5 to-transparent p-6 text-center space-y-3">
              <h3 className="font-display font-semibold">Want to analyze your own architecture?</h3>
              <p className="text-sm text-muted-foreground">Sign up free and get 10 analyses per month.</p>
              <a
                href="/signup"
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all"
                style={{ background: "hsl(16 76% 52%)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                Start for free
              </a>
            </div>
          </div>
        )}
      </main>
    </div>
  );
}
