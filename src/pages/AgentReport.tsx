import { useMemo } from "react";
import { Link, useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  ArrowLeft, TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
  Download, Share2, AlertTriangle, CheckCircle, Info, AlertCircle,
  ExternalLink, ChevronRight,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Progress } from "@/components/ui/progress";
import { Card, CardContent, CardDescription, CardHeader, CardTitle } from "@/components/ui/card";
import { Separator } from "@/components/ui/separator";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { scoreColor } from "@/lib/types";
import { api } from "@/lib/api";
import { AGENTS, AgentKey, SEVERITY_META } from "@/lib/types";
import { Skeleton } from "@/components/ui/skeleton";
import { toast } from "sonner";

const ICONS: Record<string, LucideIcon> = {
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
};

const SEVERITY_ICONS: Record<string, LucideIcon> = {
  critical: AlertCircle,
  high: AlertTriangle,
  medium: Info,
  low: CheckCircle,
};

const SEVERITY_ORDER = ["critical", "high", "medium", "low"];

export default function AgentReport() {
  const { id, agentKey } = useParams<{ id: string; agentKey: string }>();
  const navigate = useNavigate();

  const agent = AGENTS.find((a) => a.key === agentKey);
  const Icon = agent ? ICONS[agent.icon] : null;

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
  });

  const agentFindings = useMemo(() => {
    if (!analysis || !agentKey) return [];
    return analysis.findings
      .filter((f) => f.agent === agentKey)
      .sort((a, b) => SEVERITY_ORDER.indexOf(a.severity) - SEVERITY_ORDER.indexOf(b.severity));
  }, [analysis, agentKey]);

  const agentScore = analysis?.scores?.[agentKey as AgentKey] ?? 0;

  const otherScores = useMemo(() => {
    if (!analysis || !agentKey) return [];
    return AGENTS.filter((a) => a.key !== agentKey).map((a) => ({
      key: a.key,
      name: a.name.replace(" Agent", ""),
      icon: ICONS[a.icon],
      accent: a.accent,
      score: analysis.scores[a.key] ?? 0,
    }));
  }, [analysis, agentKey]);

  if (isLoading) {
    return (
      <div className="p-6 md:p-8 max-w-5xl mx-auto">
        <Skeleton className="h-8 w-48 mb-4" />
        <Skeleton className="h-64 w-full rounded-xl" />
      </div>
    );
  }

  if (error || !analysis || !agent) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Report not found.</p>
        <Link to={`/analyses/${id}`} className="text-primary text-sm mt-2 inline-block">
          Back to analysis
        </Link>
      </div>
    );
  }

  const criticalCount = agentFindings.filter((f) => f.severity === "critical").length;
  const highCount = agentFindings.filter((f) => f.severity === "high").length;

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      {/* Breadcrumb */}
      <div className="flex items-center gap-2 text-sm text-muted-foreground mb-4">
        <Link to="/analyses" className="hover:text-foreground transition-colors">Analyses</Link>
        <ChevronRight className="h-3 w-3" />
        <Link to={`/analyses/${id}`} className="hover:text-foreground transition-colors truncate max-w-[200px]">
          {analysis.name}
        </Link>
        <ChevronRight className="h-3 w-3" />
        <span className="text-foreground font-medium">{agent.name}</span>
      </div>

      {/* Agent Header */}
      <motion.div
        initial={{ opacity: 0, y: 12 }}
        animate={{ opacity: 1, y: 0 }}
        className="rounded-2xl border border-border bg-card overflow-hidden mb-6"
      >
        <div className={`h-2 bg-gradient-to-r ${agent.accent}`} />
        <div className="p-6 md:p-8">
          <div className="flex flex-col md:flex-row items-start md:items-center gap-6">
            <div className={`h-16 w-16 rounded-2xl bg-gradient-to-br ${agent.accent} grid place-items-center shadow-lg shrink-0`}>
              {Icon && <Icon className="h-8 w-8 text-white" />}
            </div>
            <div className="flex-1 min-w-0">
              <div className="flex items-center gap-3 flex-wrap">
                <h1 className="font-display text-3xl md:text-4xl font-semibold tracking-tight">{agent.name}</h1>
                <Badge variant="outline" className="font-normal text-xs">{analysis.diagram_type || "Architecture"}</Badge>
              </div>
              <p className="mt-1.5 text-muted-foreground">{agent.description}</p>
              <div className="flex items-center gap-4 mt-3 text-xs text-muted-foreground">
                <span>{analysis.workspace}</span>
                <span>·</span>
                <span>{analysis.author}</span>
                <span>·</span>
                <span>{new Date(analysis.uploaded_at).toLocaleDateString()}</span>
              </div>
            </div>
            <div className="flex flex-col items-center shrink-0">
              <div className={`relative h-24 w-24 rounded-full bg-gradient-to-br ${agent.accent} p-0.5`}>
                <div className="h-full w-full rounded-full bg-card flex items-center justify-center">
                  <span className={`font-display text-3xl font-bold ${scoreColor(agentScore)}`}>
                    {agentScore}
                  </span>
                </div>
              </div>
              <span className="text-xs text-muted-foreground mt-1.5">/ 100</span>
            </div>
          </div>
        </div>
      </motion.div>

      {/* Findings Stats + Actions */}
      <div className="grid grid-cols-1 md:grid-cols-4 gap-4 mb-6">
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.1 }}
          className="rounded-xl border border-border bg-card p-4 text-center"
        >
          <div className="text-2xl font-display font-semibold">{agentFindings.length}</div>
          <div className="text-xs text-muted-foreground mt-1">Total findings</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.15 }}
          className="rounded-xl border border-border bg-card p-4 text-center"
        >
          <div className="text-2xl font-display font-semibold text-danger">{criticalCount}</div>
          <div className="text-xs text-muted-foreground mt-1">Critical</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.2 }}
          className="rounded-xl border border-border bg-card p-4 text-center"
        >
          <div className="text-2xl font-display font-semibold text-warning">{highCount}</div>
          <div className="text-xs text-muted-foreground mt-1">High severity</div>
        </motion.div>
        <motion.div
          initial={{ opacity: 0, y: 8 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ delay: 0.25 }}
          className="rounded-xl border border-border bg-card p-4 flex items-center justify-center gap-2"
        >
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm">
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["pdf", "markdown", "json", "html", "csv"] as const).map((f) => (
                <DropdownMenuItem
                  key={f}
                  onClick={() =>
                    api.downloadExport(analysis.id, f, `${agent.name}-${analysis.name}`)
                      .then(() => toast.success(`Downloaded ${f.toUpperCase()}`))
                      .catch(() => toast.error("Export failed"))
                  }
                >
                  {f.toUpperCase()}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button variant="outline" size="sm" onClick={() => {
            navigator.clipboard.writeText(window.location.href);
            toast.success("Link copied");
          }}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
          </Button>
        </motion.div>
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-6">
        {/* Main: Findings List */}
        <div className="lg:col-span-2 space-y-4">
          <h2 className="font-display text-xl font-semibold">Findings</h2>

          {agentFindings.length === 0 && (
            <Card>
              <CardContent className="p-8 text-center text-muted-foreground">
                <CheckCircle className="h-8 w-8 mx-auto mb-2 text-success" />
                <p>No findings from this agent. The architecture appears well-optimized for this dimension.</p>
              </CardContent>
            </Card>
          )}

          {agentFindings.map((f, i) => {
            const SevIcon = SEVERITY_ICONS[f.severity] || Info;
            const meta = SEVERITY_META[f.severity];
            return (
              <motion.div
                key={f.id}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{ delay: 0.1 + i * 0.05 }}
              >
                <Card className="overflow-hidden hover:border-primary/30 transition-colors">
                  <div className={`h-1 bg-${f.severity === "critical" ? "danger" : f.severity === "high" ? "warning" : f.severity === "medium" ? "primary" : "muted"}`} />
                  <CardHeader className="pb-3">
                    <div className="flex items-start justify-between gap-3">
                      <div className="flex items-center gap-2">
                        <SevIcon className={`h-4 w-4 ${meta.color.split(" ")[0]}`} />
                        <span className={`text-[10px] uppercase tracking-wider font-semibold px-1.5 py-0.5 rounded ${meta.color}`}>
                          {meta.label}
                        </span>
                      </div>
                      {f.node_id && (
                        <Badge variant="outline" className="text-[10px] font-mono shrink-0">
                          Node: {f.node_id}
                        </Badge>
                      )}
                    </div>
                    <CardTitle className="text-base mt-2">{f.title}</CardTitle>
                    <CardDescription className="text-sm leading-relaxed">{f.summary}</CardDescription>
                  </CardHeader>
                  <CardContent>
                    <div className="rounded-lg bg-primary/5 border border-primary/15 p-4">
                      <div className="flex items-center gap-1.5 mb-1.5">
                        <span className="text-xs font-semibold text-primary uppercase tracking-wider">Recommendation</span>
                      </div>
                      <p className="text-sm leading-relaxed">{f.recommendation}</p>
                    </div>
                  </CardContent>
                </Card>
              </motion.div>
            );
          })}
        </div>

        {/* Sidebar: Other Agents Comparison */}
        <div className="space-y-6">
          <Card>
            <CardHeader>
              <CardTitle className="text-base">Agent comparison</CardTitle>
              <CardDescription>How other agents scored this architecture</CardDescription>
            </CardHeader>
            <CardContent className="space-y-4">
              {otherScores.map((s) => (
                <button
                  key={s.key}
                  type="button"
                  onClick={() => navigate(`/analyses/${id}/agents/${s.key}`)}
                  className="w-full group"
                >
                  <div className="flex items-center justify-between mb-1">
                    <div className="flex items-center gap-2 min-w-0">
                      <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${s.accent} grid place-items-center shrink-0`}>
                        <s.icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-sm truncate group-hover:text-primary transition-colors">{s.name}</span>
                    </div>
                    <span className={`text-sm font-semibold ${scoreColor(s.score)}`}>{s.score}</span>
                  </div>
                  <Progress value={s.score} className="h-1.5" />
                </button>
              ))}
            </CardContent>
          </Card>

          <Card>
            <CardHeader>
              <CardTitle className="text-base">Summary</CardTitle>
              <CardDescription>Key takeaways from this report</CardDescription>
            </CardHeader>
            <CardContent className="space-y-3 text-sm">
              <div className="flex items-start gap-2">
                <div className={`h-6 w-6 rounded-md bg-gradient-to-br ${agent.accent} grid place-items-center shrink-0 mt-0.5`}>
                  {Icon && <Icon className="h-3 w-3 text-white" />}
                </div>
                <div>
                  <span className="font-medium">{agent.name}</span>
                  <span className="text-muted-foreground"> scored this architecture </span>
                  <span className={`font-semibold ${scoreColor(agentScore)}`}>{agentScore}/100</span>
                </div>
              </div>
              <Separator />
              <div className="text-muted-foreground">
                {agentFindings.length > 0 ? (
                  <>
                    Found <span className="font-medium text-foreground">{agentFindings.length} finding{agentFindings.length !== 1 ? "s" : ""}</span>,
                    including <span className="text-danger font-medium">{criticalCount} critical</span>
                    {highCount > 0 && <> and <span className="text-warning font-medium">{highCount} high</span></>}.
                  </>
                ) : (
                  "No issues found — this architecture is well-optimized for this dimension."
                )}
              </div>
              <Separator />
              <div className="flex items-center gap-2">
                <Link
                  to={`/analyses/${id}`}
                  className="text-sm text-primary hover:underline inline-flex items-center gap-1"
                >
                  Full analysis <ExternalLink className="h-3 w-3" />
                </Link>
              </div>
            </CardContent>
          </Card>
        </div>
      </div>
    </div>
  );
}
