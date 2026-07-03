import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import { motion } from "framer-motion";
import {
  Download, Share2, Sparkles, Send, ArrowLeft, Loader2, Scale, Flame, Slack,
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
  HelpCircle,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { ScoreRing } from "@/components/ScoreRing";
import { MediatorReport } from "@/components/MediatorReport";
import { AGENTS, AgentKey, Severity, SEVERITY_META, overallScore, scoreColor } from "@/lib/types";
import { getSlackWebhook } from "@/lib/integrations";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import type { Finding } from "@/lib/api";

const ICONS: Record<string, LucideIcon> = {
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
  HelpCircle,
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  analyzing: "Analyzing",
  queued: "Queued",
  failed: "Failed",
};

const SEVERITY_RANK: Record<Severity, number> = { low: 1, medium: 2, high: 3, critical: 4 };

/** Ring/glow treatment per worst finding severity (low keeps the default node look). */
const HEAT_STYLES: Partial<Record<Severity, { border: string; glow: string }>> = {
  critical: {
    border: "hsl(var(--danger))",
    glow: "0 0 0 3px hsl(var(--danger) / 0.25), 0 0 18px hsl(var(--danger) / 0.35)",
  },
  high: {
    border: "#fb923c",
    glow: "0 0 0 3px rgb(251 146 60 / 0.22), 0 0 14px rgb(251 146 60 / 0.28)",
  },
  medium: {
    border: "hsl(var(--warning))",
    glow: "0 0 0 3px hsl(var(--warning) / 0.2)",
  },
};

function downloadGeneratedDoc(analysisId: string, docType: "readme" | "adr", label: string) {
  api.getGeneratedDoc(analysisId, docType)
    .then((doc) => {
      const blob = new Blob([doc.markdown], { type: "text/markdown" });
      const url = URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.href = url;
      a.download = doc.filename;
      a.click();
      URL.revokeObjectURL(url);
      toast.success(`Downloaded ${label}`);
    })
    .catch(() => toast.error(`${label} generation failed`));
}

export default function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeAgent, setActiveAgent] = useState<AgentKey | "all">("all");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);
  // null = "no user choice yet" → defaults to ON when any finding maps to a node.
  const [heatmapOverride, setHeatmapOverride] = useState<boolean | null>(null);
  const [sendingSlack, setSendingSlack] = useState(false);

  const { data: analysis, isLoading, error, refetch } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
    refetchInterval: (q) => (q.state.data?.status === "analyzing" || q.state.data?.status === "queued" ? 2000 : false),
  });

  const findings = useMemo(() => {
    if (!analysis) return [];
    return analysis.findings.filter((f) => {
      if (activeAgent !== "all" && f.agent !== activeAgent) return false;
      if (selectedNode && f.node_id !== selectedNode) return false;
      return true;
    });
  }, [analysis, activeAgent, selectedNode]);

  // Findings grouped per diagram node, worst severity first.
  const findingsByNode = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of analysis?.findings ?? []) {
      if (!f.node_id) continue;
      const arr = map.get(f.node_id) ?? [];
      arr.push(f);
      map.set(f.node_id, arr);
    }
    for (const arr of map.values()) arr.sort((a, b) => SEVERITY_RANK[b.severity] - SEVERITY_RANK[a.severity]);
    return map;
  }, [analysis]);

  const hasNodeFindings = findingsByNode.size > 0;
  const heatmapOn = heatmapOverride ?? hasNodeFindings;

  const nodes = useMemo(() => {
    if (!analysis?.diagram_nodes?.length) return [];
    return analysis.diagram_nodes.map((n) => {
      const nodeFindings = heatmapOn ? findingsByNode.get(n.id) : undefined;
      const heat = nodeFindings ? HEAT_STYLES[nodeFindings[0].severity] : undefined;
      const selected = selectedNode === n.id;
      return {
        ...n,
        type: "default" as const,
        data: nodeFindings?.length
          ? {
              ...n.data,
              label: (
                <Tooltip delayDuration={150}>
                  <TooltipTrigger asChild>
                    <span className="block w-full">{n.data.label}</span>
                  </TooltipTrigger>
                  <TooltipContent side="top" className="max-w-xs p-2.5 space-y-2 text-left">
                    {nodeFindings.map((f) => (
                      <div key={f.id}>
                        <div className="flex items-center gap-1.5">
                          <span className={`shrink-0 text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_META[f.severity].color}`}>
                            {SEVERITY_META[f.severity].label}
                          </span>
                          <span className="text-xs font-medium leading-snug">{f.title}</span>
                        </div>
                        <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">{f.recommendation}</p>
                      </div>
                    ))}
                  </TooltipContent>
                </Tooltip>
              ),
            }
          : n.data,
        style: {
          border: `1px solid ${selected ? "hsl(var(--primary))" : heat ? heat.border : "hsl(var(--border))"}`,
          background: "hsl(var(--card))",
          color: "hsl(var(--foreground))",
          borderRadius: 10,
          padding: 10,
          fontSize: 12,
          fontWeight: 500,
          width: 150,
          boxShadow: selected ? "0 0 0 4px hsl(var(--primary) / 0.2)" : heat?.glow,
        },
      };
    });
  }, [analysis, selectedNode, heatmapOn, findingsByNode]);

  const edges = useMemo(() =>
    (analysis?.diagram_edges ?? []).map((e, i) => ({
      ...e,
      id: e.id || `e${i}`,
      animated: true,
      style: { stroke: "hsl(var(--primary) / 0.6)", strokeWidth: 1.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
    })),
  [analysis]);

  if (isLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analysis…</div>;
  }

  if (error || !analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Analysis not found.</p>
        <Link to="/analyses" className="text-primary text-sm mt-2 inline-block">Back to analyses</Link>
      </div>
    );
  }

  const sendToSlack = async () => {
    const url = getSlackWebhook();
    if (!url) {
      toast.error("Add a Slack webhook in Settings → Integrations first");
      return;
    }
    setSendingSlack(true);
    try {
      await api.slackNotify(url, analysis.id);
      toast.success("Findings sent to Slack");
    } catch {
      toast.error("Failed to send findings to Slack");
    } finally {
      setSendingSlack(false);
    }
  };

  const overall = overallScore(analysis.scores);
  const statusClass = {
    ready: "bg-success/10 text-success border-success/20",
    analyzing: "bg-primary/10 text-primary border-primary/20",
    queued: "bg-muted text-muted-foreground border-border",
    failed: "bg-danger/10 text-danger border-danger/20",
  }[analysis.status] ?? "";

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <Link to="/analyses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to analyses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{analysis.name}</h1>
            {analysis.diagram_type && <Badge variant="outline" className="font-normal">{analysis.diagram_type}</Badge>}
            <Badge className={statusClass}>{STATUS_LABEL[analysis.status] ?? analysis.status}</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">
            {analysis.workspace} · {analysis.author} · {new Date(analysis.uploaded_at).toLocaleString()}
          </p>
        </div>
        <div className="flex items-center gap-1.5 sm:gap-2 flex-wrap">
          <Button
            variant="outline"
            size="sm"
            disabled={!hasNodeFindings}
            onClick={() => setHeatmapOverride(!heatmapOn)}
            className={cn(heatmapOn && hasNodeFindings && "border-primary/50 bg-primary/5 text-primary hover:text-primary")}
            title={hasNodeFindings ? "Toggle finding-severity overlay on the diagram" : "No findings are mapped to diagram nodes"}
          >
            <Flame className="h-3.5 w-3.5 mr-1.5" /> Risk heatmap
          </Button>
          <Button
            variant="outline"
            size="sm"
            disabled={analysis.status !== "ready" || sendingSlack}
            onClick={sendToSlack}
          >
            {sendingSlack ? <Loader2 className="h-3.5 w-3.5 mr-1.5 animate-spin" /> : <Slack className="h-3.5 w-3.5 mr-1.5" />}
            Send to Slack
          </Button>
          <Button variant="outline" size="sm" onClick={async () => {
            try {
              const link = await api.createShareLink(analysis.id);
              const url = `${window.location.origin}${link.url}`;
              await navigator.clipboard.writeText(url);
              toast.success("Share link copied to clipboard");
            } catch {
              navigator.clipboard.writeText(window.location.href);
              toast.success("Link copied");
            }
          }}>
            <Share2 className="h-3.5 w-3.5 mr-1.5" /> Share
          </Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm" disabled={analysis.status !== "ready"}>
                <Download className="h-3.5 w-3.5 mr-1.5" /> Export
              </Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {(["pdf", "markdown", "json", "html", "csv"] as const).map((f) => (
                <DropdownMenuItem key={f} onClick={() => api.downloadExport(analysis.id, f, analysis.name).then(() => toast.success(`Downloaded ${f.toUpperCase()}`)).catch(() => toast.error("Export failed"))}>
                  {f.toUpperCase()}
                </DropdownMenuItem>
              ))}
              {([["readme", "Architecture doc"], ["adr", "ADR"]] as const).map(([docType, label]) => (
                <DropdownMenuItem key={docType} onClick={() => downloadGeneratedDoc(analysis.id, docType, label)}>
                  {label}
                </DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button asChild variant="outline" size="sm">
            <Link to={`/analyses/${analysis.id}/report`}><Sparkles className="h-3.5 w-3.5 mr-1.5" /> Report</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/analyses/${analysis.id}/docs`}><Download className="h-3.5 w-3.5 mr-1.5" /> Docs</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/analyses/${analysis.id}/heatmap`}><Flame className="h-3.5 w-3.5 mr-1.5" /> Heatmap</Link>
          </Button>
          <Button asChild variant="outline" size="sm">
            <Link to={`/analyses/${analysis.id}/report-builder`}><Download className="h-3.5 w-3.5 mr-1.5" /> Report Builder</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/analyses/${analysis.id}/history`}><Scale className="h-3.5 w-3.5 mr-1.5" /> History</Link>
          </Button>
          <Button asChild variant="ghost" size="sm">
            <Link to={`/analyses/${analysis.id}/audit`}><ShieldCheck className="h-3.5 w-3.5 mr-1.5" /> Audit</Link>
          </Button>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90" onClick={() => refetch()}>
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Refresh
          </Button>
        </div>
      </div>

      {(analysis.status === "analyzing" || analysis.status === "queued") && (
        <div className="mb-6 rounded-xl border border-primary/30 bg-primary/5 p-4 flex items-center gap-3 text-sm">
          <Loader2 className="h-4 w-4 animate-spin text-primary" />
          Agents are analyzing your architecture… This page updates automatically.
        </div>
      )}

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 col-span-2 md:col-span-1 flex flex-col items-center justify-center">
          <ScoreRing value={overall} size={84} label="Overall" />
        </div>
        {AGENTS.map((a2) => {
          const Icon = ICONS[a2?.icon];
          const s = analysis.scores[a2?.key] ?? 0;
          if (!Icon) return null;
          return (
            <Link
              key={a2.key}
              to={`/analyses/${analysis.id}/agents/${a2.key}`}
              className={cn(
                "rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5 block",
                activeAgent === a2.key ? "border-primary shadow-glow" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={`h-7 w-7 rounded-md bg-gradient-to-br ${a2.accent} grid place-items-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className={cn("text-lg font-display font-semibold", scoreColor(s))}>{s || "—"}</div>
              </div>
              <div className="mt-2 text-[11px] font-medium truncate">{a2.name.replace(" Agent", "")}</div>
            </Link>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="text-sm font-medium">Interactive viewer</div>
            <div className="text-xs text-muted-foreground">
              {selectedNode ? (
                <button type="button" className="text-primary hover:underline" onClick={() => setSelectedNode(null)}>Clear node filter</button>
              ) : "Click a node to filter findings"}
            </div>
          </div>
          <div className="relative h-[520px]">
            {heatmapOn && nodes.length > 0 && (
              <div className="pointer-events-none absolute top-3 left-3 z-10 flex items-center gap-1 sm:gap-3 rounded-lg border border-border bg-card/90 backdrop-blur px-1.5 sm:px-3 py-1 sm:py-1.5 text-[10px] sm:text-[11px] text-muted-foreground">
                <span className="flex items-center gap-1 sm:gap-1.5"><span className="h-1.5 sm:h-2.5 w-1.5 sm:w-2.5 rounded-full bg-success" /> Healthy</span>
                <span className="flex items-center gap-1 sm:gap-1.5"><span className="h-1.5 sm:h-2.5 w-1.5 sm:w-2.5 rounded-full bg-warning" /> Warning</span>
                <span className="flex items-center gap-1 sm:gap-1.5"><span className="h-1.5 sm:h-2.5 w-1.5 sm:w-2.5 rounded-full bg-orange-400" /> High</span>
                <span className="flex items-center gap-1 sm:gap-1.5"><span className="h-1.5 sm:h-2.5 w-1.5 sm:w-2.5 rounded-full bg-danger" /> Critical</span>
              </div>
            )}
            {nodes.length > 0 ? (
              <ReactFlow
                nodes={nodes}
                edges={edges}
                fitView
                onNodeClick={(_, n) => setSelectedNode(selectedNode === n.id ? null : n.id)}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
              >
                <Background gap={20} size={1} color="hsl(var(--border))" />
                <Controls className="!bg-card !border-border" />
                <MiniMap className="!bg-card !border-border" maskColor="hsl(var(--background) / 0.7)" />
              </ReactFlow>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">Diagram will appear when analysis completes</div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col min-h-[520px]">
          <Tabs defaultValue="findings" className="flex-1 flex flex-col">
            <TabsList className="m-3 max-sm:gap-0">
              <TabsTrigger value="findings" className="max-sm:px-2 max-sm:text-[11px]">Findings</TabsTrigger>
              <TabsTrigger value="debate" className="max-sm:px-2 max-sm:text-[11px]">Debate</TabsTrigger>
              <TabsTrigger value="report" className="max-sm:px-2 max-sm:text-[11px]">Report</TabsTrigger>
              <TabsTrigger value="chat" className="max-sm:px-2 max-sm:text-[11px]">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="findings" className="flex-1 m-0 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
              {findings.length === 0 && (
                <p className="text-sm text-muted-foreground px-1 py-4">No findings match the current filter.</p>
              )}
              {findings.map((f) => {
                const agent = AGENTS.find((a) => a.key === f.agent) ?? { key: f.agent, name: "Unknown Agent", description: "", accent: "from-muted to-muted", icon: "HelpCircle" };
                const Icon = ICONS[agent?.icon];
                if (!Icon) return null;
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`h-5 w-5 rounded bg-gradient-to-br ${agent.accent} grid place-items-center`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{agent.name.replace(" Agent", "")}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_META[f.severity].color}`}>
                        {SEVERITY_META[f.severity].label}
                      </span>
                    </div>
                    <div className="text-sm font-medium leading-snug">{f.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.summary}</p>
                    <div className="mt-2 rounded-md bg-primary/5 border border-primary/15 p-2 text-xs leading-relaxed">
                      <span className="font-medium text-primary">Fix:</span> {f.recommendation}
                    </div>
                  </motion.div>
                );
              })}
            </TabsContent>
            <TabsContent value="debate" className="flex-1 m-0 overflow-y-auto scrollbar-thin px-3 pb-3">
              {analysis.mediator_report ? (
                <MediatorReport report={analysis.mediator_report} />
              ) : (
                <p className="text-sm text-muted-foreground px-1 py-4">Debate report will appear when analysis completes.</p>
              )}
            </TabsContent>
            <TabsContent value="report" className="flex-1 m-0 overflow-y-auto scrollbar-thin px-3 pb-3">
              <ReportPanel analysisId={analysis.id} analysisName={analysis.name} enabled={analysis.status === "ready"} />
            </TabsContent>
            <TabsContent value="chat" className="flex-1 m-0 flex flex-col">
              <ChatPanel analysisId={analysis.id} enabled={analysis.status === "ready"} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

const REPORT_AUDIENCES = [
  { value: "cto", label: "CTO" },
  { value: "engineering_manager", label: "Engineering Manager" },
  { value: "investor", label: "Investor" },
  { value: "product_manager", label: "Product Manager" },
  { value: "architect", label: "Solution Architect" },
];

function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-1.5">
      {markdown.split("\n").map((line, i) => {
        const bold = (s: string) => {
          const parts = s.split(/\*\*(.+?)\*\*/g);
          return parts.map((p, j) => (j % 2 === 1 ? <strong key={j} className="text-foreground">{p}</strong> : p));
        };
        if (line.startsWith("# ")) return <h2 key={i} className="font-display text-base font-semibold pt-1">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="font-display text-sm font-semibold pt-2">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold pt-1.5">{line.slice(4)}</h4>;
        if (line.startsWith("- ")) return <div key={i} className="text-xs text-muted-foreground pl-3 leading-relaxed">• {bold(line.slice(2))}</div>;
        if (!line.trim()) return null;
        return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{bold(line)}</p>;
      })}
    </div>
  );
}

function ReportPanel({ analysisId, analysisName, enabled }: { analysisId: string; analysisName: string; enabled: boolean }) {
  const [audience, setAudience] = useState("cto");
  const { data: report, isLoading, error } = useQuery({
    queryKey: ["executive-report", analysisId, audience],
    queryFn: () => api.getExecutiveReport(analysisId, audience),
    enabled,
  });

  const download = () => {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysisName.replace(/[^\w.-]+/g, "_")}-${audience}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
  };

  if (!enabled) {
    return <p className="text-sm text-muted-foreground px-1 py-4">Report will be available when analysis completes.</p>;
  }

  return (
    <div className="space-y-3 pt-1">
      <div className="flex flex-wrap gap-1.5">
        {REPORT_AUDIENCES.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAudience(a.value)}
            className={cn(
              "text-[11px] px-2 py-1 rounded-md border transition-colors",
              audience === a.value
                ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                : "border-border text-muted-foreground hover:border-primary/30",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>
      {isLoading && <p className="text-xs text-muted-foreground py-4 animate-pulse">Generating report…</p>}
      {error && <p className="text-xs text-danger py-4">Could not load report. Try again.</p>}
      {report && (
        <>
          <div className="flex items-center gap-2 text-xs text-muted-foreground">
            <Badge variant="outline">Score {report.score}/100</Badge>
            <Badge variant="outline">Risk: {report.risk_level}</Badge>
            <Button variant="outline" size="sm" className="ml-auto h-7 text-xs" onClick={download}>
              <Download className="h-3 w-3 mr-1" /> .md
            </Button>
          </div>
          <div className="rounded-lg border border-border bg-background/40 p-3">
            <ReportMarkdown markdown={report.markdown} />
          </div>
        </>
      )}
    </div>
  );
}

function ChatPanel({ analysisId, enabled }: { analysisId: string; enabled: boolean }) {
  const queryClient = useQueryClient();
  const { data: messages = [] } = useQuery({
    queryKey: ["chat", analysisId],
    queryFn: () => api.getChat(analysisId),
    enabled,
  });
  const [input, setInput] = useState("");

  const sendMutation = useMutation({
    mutationFn: (message: string) => api.postChat(analysisId, message),
    onMutate: async (message) => {
      await queryClient.cancelQueries({ queryKey: ["chat", analysisId] });
      const prev = queryClient.getQueryData<typeof messages>(["chat", analysisId]) ?? [];
      queryClient.setQueryData(["chat", analysisId], [
        ...prev,
        { id: `tmp-${Date.now()}`, role: "user" as const, content: message, created_at: new Date().toISOString() },
      ]);
    },
    onSuccess: () => queryClient.invalidateQueries({ queryKey: ["chat", analysisId] }),
    onSettled: () => setInput(""),
  });

  const send = () => {
    if (!input.trim() || !enabled) return;
    sendMutation.mutate(input.trim());
  };

  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin">
        {messages.length === 0 && enabled && (
          <div className="rounded-lg px-3 py-2 text-sm leading-relaxed bg-muted/50 text-foreground">
            Ask anything about this architecture — I have full context of the diagram and all findings.
          </div>
        )}
        {messages.map((m) => (
          <div key={m.id} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "user" ? "bg-primary text-primary-foreground" : "bg-muted/50 text-foreground"
            )}>{m.content}</div>
          </div>
        ))}
        {sendMutation.isPending && (
          <div className="text-xs text-muted-foreground flex items-center gap-2">
            <Loader2 className="h-3 w-3 animate-spin" /> Thinking…
          </div>
        )}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder={enabled ? "Ask about scalability, security, costs…" : "Available when analysis is ready"}
          disabled={!enabled || sendMutation.isPending}
        />
        <Button size="icon" onClick={send} disabled={!enabled || sendMutation.isPending} className="bg-gradient-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
