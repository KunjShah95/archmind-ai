import { useMemo, useState } from "react";
import { Link, useNavigate, useParams } from "react-router-dom";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import { motion } from "framer-motion";
import {
  Download, Share2, Sparkles, Send, ArrowLeft, Loader2,
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
} from "lucide-react";
import type { LucideIcon } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/ScoreRing";
import { AGENTS, AgentKey, SEVERITY_META, overallScore, scoreColor } from "@/lib/types";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const ICONS: Record<string, LucideIcon> = {
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
};

const STATUS_LABEL: Record<string, string> = {
  ready: "Ready",
  analyzing: "Analyzing",
  queued: "Queued",
  failed: "Failed",
};

export default function AnalysisDetail() {
  const { id } = useParams();
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [activeAgent, setActiveAgent] = useState<AgentKey | "all">("all");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

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

  const nodes = useMemo(() => {
    if (!analysis?.diagram_nodes?.length) return [];
    return analysis.diagram_nodes.map((n) => ({
      ...n,
      type: "default" as const,
      style: {
        border: `1px solid ${selectedNode === n.id ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
        background: "hsl(var(--card))",
        color: "hsl(var(--foreground))",
        borderRadius: 10,
        padding: 10,
        fontSize: 12,
        fontWeight: 500,
        width: 150,
        boxShadow: selectedNode === n.id ? "0 0 0 4px hsl(var(--primary) / 0.2)" : undefined,
      },
    }));
  }, [analysis, selectedNode]);

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
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm" onClick={() => { navigator.clipboard.writeText(window.location.href); toast.success("Link copied"); }}>
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
            </DropdownMenuContent>
          </DropdownMenu>
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
          const Icon = ICONS[a2.icon];
          const s = analysis.scores[a2.key] ?? 0;
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
          <div className="h-[520px]">
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
            <TabsList className="m-3">
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="findings" className="flex-1 m-0 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
              {findings.length === 0 && (
                <p className="text-sm text-muted-foreground px-1 py-4">No findings match the current filter.</p>
              )}
              {findings.map((f) => {
                const agent = AGENTS.find((a) => a.key === f.agent)!;
                const Icon = ICONS[agent.icon];
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
            <TabsContent value="chat" className="flex-1 m-0 flex flex-col">
              <ChatPanel analysisId={analysis.id} enabled={analysis.status === "ready"} />
            </TabsContent>
          </Tabs>
        </div>
      </div>
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
