import { useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import { motion } from "framer-motion";
import {
  ArrowLeft, Loader2, AlertTriangle,
  BarChart3, Network, X,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tooltip, TooltipContent, TooltipTrigger } from "@/components/ui/tooltip";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { SEVERITY_META, overallScore } from "@/lib/types";
import type { Finding } from "@/lib/api";
import type { NodeImpact } from "@/lib/types";

const RISK_META = {
  healthy: { label: "Healthy", dot: "bg-success", text: "text-success", border: "border-success", bg: "bg-success/10", scoreRange: "80\u2013100", sort: 0 },
  warning: { label: "Warning", dot: "bg-warning", text: "text-warning", border: "border-warning", bg: "bg-warning/10", scoreRange: "65\u201379", sort: 1 },
  high: { label: "High Risk", dot: "bg-orange-400", text: "text-orange-400", border: "border-orange-400", bg: "bg-orange-500/10", scoreRange: "50\u201364", sort: 2 },
  critical: { label: "Critical", dot: "bg-danger", text: "text-danger", border: "border-danger", bg: "bg-danger/10", scoreRange: "0\u201349", sort: 3 },
} as const;

type RiskLevel = keyof typeof RISK_META;

function computeNodeScore(findings: Finding[]): number {
  let score = 100;
  for (const f of findings) {
    if (f.severity === "critical") score -= 35;
    else if (f.severity === "high") score -= 20;
    else if (f.severity === "medium") score -= 10;
    else if (f.severity === "low") score -= 5;
  }
  return Math.max(0, score);
}

function getRiskLevel(score: number): RiskLevel {
  if (score >= 80) return "healthy";
  if (score >= 65) return "warning";
  if (score >= 50) return "high";
  return "critical";
}

function getNodeStyle(level: RiskLevel, selected: boolean): React.CSSProperties {
  const borderMap: Record<RiskLevel, string> = {
    critical: "hsl(var(--danger))",
    high: "#fb923c",
    warning: "hsl(var(--warning))",
    healthy: "hsl(var(--success))",
  };
  const glowMap: Record<RiskLevel, string> = {
    critical: "0 0 0 3px hsl(var(--danger) / 0.25), 0 0 18px hsl(var(--danger) / 0.35)",
    high: "0 0 0 3px rgb(251 146 60 / 0.22), 0 0 14px rgb(251 146 60 / 0.28)",
    warning: "0 0 0 3px hsl(var(--warning) / 0.2)",
    healthy: "0 0 0 2px hsl(var(--success) / 0.15)",
  };
  return {
    border: `2px solid ${borderMap[level]}`,
    background: "hsl(var(--card))",
    color: "hsl(var(--foreground))",
    borderRadius: 10,
    padding: 12,
    fontSize: 12,
    fontWeight: 500,
    width: 160,
    boxShadow: selected
      ? `0 0 0 4px hsl(var(--primary) / 0.25), ${glowMap[level]}`
      : glowMap[level],
  };
}

export default function RiskHeatmap() {
  const { id } = useParams<{ id: string }>();
  const [selectedNodeId, setSelectedNodeId] = useState<string | null>(null);

  const { data: analysis, isLoading, error } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: !!id,
  });

  const { data: impactMatrix = [] } = useQuery({
    queryKey: ["graph-impact", id],
    queryFn: () => api.getGraphImpactMatrix(id!),
    enabled: !!id,
  });

  const findingsByNode = useMemo(() => {
    const map = new Map<string, Finding[]>();
    for (const f of analysis?.findings ?? []) {
      if (!f.node_id) continue;
      const arr = map.get(f.node_id) ?? [];
      arr.push(f);
      map.set(f.node_id, arr);
    }
    return map;
  }, [analysis]);

  const nodeScores = useMemo(() => {
    const map = new Map<string, { score: number; level: RiskLevel; findings: Finding[] }>();
    for (const node of analysis?.diagram_nodes ?? []) {
      const nodeFindings = findingsByNode.get(node.id) ?? [];
      const score = computeNodeScore(nodeFindings);
      map.set(node.id, { score, level: getRiskLevel(score), findings: nodeFindings });
    }
    return map;
  }, [analysis, findingsByNode]);

  const reactFlowNodes = useMemo(() => {
    if (!analysis?.diagram_nodes?.length) return [];
    return analysis.diagram_nodes.map((n) => {
      const info = nodeScores.get(n.id);
      const level = info?.level ?? "healthy";
      const selected = selectedNodeId === n.id;
      const nodeFindings = info?.findings ?? [];
      return {
        ...n,
        type: "default" as const,
        data: {
          ...n.data,
          label: nodeFindings.length > 0 ? (
            <Tooltip delayDuration={150}>
              <TooltipTrigger asChild>
                <span className="block w-full">{n.data.label}</span>
              </TooltipTrigger>
              <TooltipContent side="top" className="max-w-xs p-2.5 space-y-2 text-left">
                <div className="flex items-center gap-2">
                  <span className={cn("text-xs font-semibold", RISK_META[level].text)}>
                    Score: {info?.score}
                  </span>
                  <Badge variant="outline" className={cn("text-[10px]", RISK_META[level].text, RISK_META[level].border)}>
                    {RISK_META[level].label}
                  </Badge>
                </div>
                {nodeFindings.slice(0, 3).map((f) => (
                  <div key={f.id}>
                    <div className="flex items-center gap-1.5">
                      <span className={cn("shrink-0 text-[10px] px-1.5 py-0.5 rounded", SEVERITY_META[f.severity].color)}>
                        {SEVERITY_META[f.severity].label}
                      </span>
                      <span className="text-xs font-medium leading-snug">{f.title}</span>
                    </div>
                    <p className="mt-0.5 text-[11px] text-muted-foreground leading-snug line-clamp-2">{f.recommendation}</p>
                  </div>
                ))}
                {nodeFindings.length > 3 && (
                  <p className="text-[11px] text-muted-foreground">+{nodeFindings.length - 3} more findings</p>
                )}
              </TooltipContent>
            </Tooltip>
          ) : n.data.label,
        },
        style: getNodeStyle(level, selected),
      };
    });
  }, [analysis, nodeScores, selectedNodeId]);

  const reactFlowEdges = useMemo(() =>
    (analysis?.diagram_edges ?? []).map((e, i) => ({
      ...e,
      id: e.id || `e${i}`,
      animated: true,
      style: { stroke: "hsl(var(--primary) / 0.6)", strokeWidth: 1.6 },
      markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
    })),
  [analysis]);

  const impactMap = useMemo(() => {
    const map = new Map<string, NodeImpact>();
    for (const imp of impactMatrix) map.set(imp.node_id, imp);
    return map;
  }, [impactMatrix]);

  const riskDistribution = useMemo(() => {
    const counts: Record<RiskLevel, number> = { healthy: 0, warning: 0, high: 0, critical: 0 };
    for (const info of nodeScores.values()) counts[info.level]++;
    return counts;
  }, [nodeScores]);

  const selectedNode = useMemo(() => {
    if (!selectedNodeId || !analysis?.diagram_nodes) return null;
    const node = analysis.diagram_nodes.find((n) => n.id === selectedNodeId);
    if (!node) return null;
    const info = nodeScores.get(selectedNodeId);
    const impact = impactMap.get(selectedNodeId);
    const findings = findingsByNode.get(selectedNodeId) ?? [];
    return { node, info, impact, findings };
  }, [selectedNodeId, analysis, nodeScores, impactMap, findingsByNode]);

  const nodeCount = analysis?.diagram_nodes?.length ?? 0;
  const overall = overallScore(analysis?.scores ?? {});

  if (isLoading) {
    return (
      <div className="p-8 text-center text-muted-foreground inline-flex items-center gap-2">
        <Loader2 className="h-4 w-4 animate-spin" /> Loading heatmap\u2026
      </div>
    );
  }

  if (error || !analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Analysis not found.</p>
        <Link to="/analyses" className="text-primary text-sm mt-2 inline-block">Back to analyses</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <Link
        to={`/analyses/${analysis.id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to analysis
      </Link>

      <PageHeader
        title="Risk Heatmap"
        description={`Visual risk overlay for "${analysis.name}" \u2014 node colors reflect computed risk from agent findings.`}
      />

      <div className="flex flex-wrap items-center gap-3 sm:gap-6 mb-6 rounded-xl border border-border bg-card px-4 py-3">
        <span className="text-xs font-medium text-muted-foreground">Risk level</span>
        {(["healthy", "warning", "high", "critical"] as RiskLevel[]).map((level) => (
          <div key={level} className="flex items-center gap-1.5 text-xs">
            <span className={cn("h-2.5 w-2.5 rounded-full", RISK_META[level].dot)} />
            <span className={RISK_META[level].text}>{RISK_META[level].label}</span>
            <span className="text-muted-foreground/60">({RISK_META[level].scoreRange})</span>
          </div>
        ))}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="text-sm font-medium">Architecture heatmap</div>
            <div className="text-xs text-muted-foreground">
              {nodeCount} component{nodeCount !== 1 ? "s" : ""}
              {selectedNodeId ? (
                <>
                  {" \u00B7 "}
                  <button type="button" className="text-primary hover:underline" onClick={() => setSelectedNodeId(null)}>
                    Clear selection
                  </button>
                </>
              ) : null}
            </div>
          </div>
          <div className="relative h-[560px]">
            {reactFlowNodes.length > 0 ? (
              <ReactFlow
                nodes={reactFlowNodes}
                edges={reactFlowEdges}
                fitView
                onNodeClick={(_, n) => setSelectedNodeId(selectedNodeId === n.id ? null : n.id)}
                proOptions={{ hideAttribution: true }}
                nodesDraggable={false}
              >
                <Background gap={20} size={1} color="hsl(var(--border))" />
                <Controls className="!bg-card !border-border" />
                <MiniMap className="!bg-card !border-border" maskColor="hsl(var(--background) / 0.7)" />
              </ReactFlow>
            ) : (
              <div className="h-full grid place-items-center text-sm text-muted-foreground">
                No diagram data available
              </div>
            )}
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          {selectedNode ? (
            <NodeDetailsPanel
              node={selectedNode.node}
              info={selectedNode.info!}
              impact={selectedNode.impact ?? null}
              findings={selectedNode.findings}
              onClose={() => setSelectedNodeId(null)}
            />
          ) : (
            <RiskSummaryPanel
              distribution={riskDistribution}
              totalNodes={nodeCount}
              overallScore={overall}
            />
          )}
        </div>
      </div>
    </div>
  );
}

function RiskSummaryPanel({
  distribution,
  totalNodes,
  overallScore: overall,
}: {
  distribution: Record<RiskLevel, number>;
  totalNodes: number;
  overallScore: number;
}) {
  const levels = ["critical", "high", "warning", "healthy"] as RiskLevel[];
  const overallLevel = getRiskLevel(overall);

  return (
    <div className="p-4 space-y-4">
      <div className="flex items-center gap-3">
        <BarChart3 className="h-4 w-4 text-primary" />
        <span className="text-sm font-medium">Risk Distribution</span>
      </div>

      <div className="rounded-xl border border-border bg-background/40 p-3 flex items-center gap-3">
        <div className={cn(
          "h-12 w-12 rounded-full grid place-items-center text-lg font-display font-bold border-2",
          RISK_META[overallLevel].border, RISK_META[overallLevel].text, RISK_META[overallLevel].bg,
        )}>
          {overall}
        </div>
        <div>
          <div className="text-sm font-medium">Overall Score</div>
          <div className={cn("text-xs", RISK_META[overallLevel].text)}>
            {RISK_META[overallLevel].label}
          </div>
        </div>
      </div>

      <div className="text-xs text-muted-foreground">
        {totalNodes} component{totalNodes !== 1 ? "s" : ""} analyzed
      </div>

      <div className="space-y-2.5">
        {levels.map((level) => {
          const count = distribution[level];
          const pct = totalNodes > 0 ? Math.round((count / totalNodes) * 100) : 0;
          const meta = RISK_META[level];
          return (
            <div key={level}>
              <div className="flex items-center justify-between text-xs mb-1">
                <div className="flex items-center gap-1.5">
                  <span className={cn("h-2 w-2 rounded-full", meta.dot)} />
                  <span className={meta.text}>{meta.label}</span>
                </div>
                <span className="text-muted-foreground">{count} ({pct}%)</span>
              </div>
              <div className="h-2 rounded-full bg-background overflow-hidden">
                <div
                  className={cn("h-full rounded-full transition-all duration-500", meta.dot)}
                  style={{ width: `${pct}%` }}
                />
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function NodeDetailsPanel({
  node,
  info,
  impact,
  findings,
  onClose,
}: {
  node: { id: string; data: { label: string } };
  info: { score: number; level: RiskLevel };
  impact: NodeImpact | null;
  findings: Finding[];
  onClose: () => void;
}) {
  const level = info.level;
  const meta = RISK_META[level];

  return (
    <div className="flex flex-col h-full">
      <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
        <div className="flex items-center gap-2 min-w-0">
          <Network className="h-4 w-4 text-primary shrink-0" />
          <span className="text-sm font-medium truncate">{node.data.label}</span>
        </div>
        <button type="button" onClick={onClose} className="text-muted-foreground hover:text-foreground shrink-0">
          <X className="h-4 w-4" />
        </button>
      </div>

      <div className="flex-1 overflow-y-auto scrollbar-thin p-4 space-y-4">
        <div className={cn("rounded-xl border-2 p-3 flex items-center gap-3", meta.border, meta.bg)}>
          <div className={cn(
            "h-12 w-12 rounded-full grid place-items-center text-lg font-display font-bold border-2",
            meta.border, meta.text,
          )}>
            {info.score}
          </div>
          <div>
            <div className="text-sm font-medium">{meta.label}</div>
            <div className="text-[11px] text-muted-foreground">Risk score: {info.score}/100</div>
          </div>
        </div>

        {impact && (
          <div>
            <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">Impact Metrics</h3>
            <div className="grid grid-cols-2 gap-2">
              <div className="rounded-lg border border-border bg-background/40 p-2.5">
                <div className="text-[10px] text-muted-foreground">Impact Score</div>
                <div className={cn("text-sm font-semibold font-display", impact.impact_score >= 70 ? "text-danger" : impact.impact_score >= 40 ? "text-warning" : "text-success")}>
                  {impact.impact_score}/100
                </div>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-2.5">
                <div className="text-[10px] text-muted-foreground">Centrality</div>
                <div className="text-sm font-semibold font-display">{impact.degree_centrality.toFixed(2)}</div>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-2.5">
                <div className="text-[10px] text-muted-foreground">Affected</div>
                <div className="text-sm font-semibold font-display">{impact.affected_count} component{impact.affected_count !== 1 ? "s" : ""}</div>
              </div>
              <div className="rounded-lg border border-border bg-background/40 p-2.5">
                <div className="text-[10px] text-muted-foreground">Degree</div>
                <div className="text-sm font-semibold font-display">{impact.in_degree} in / {impact.out_degree} out</div>
              </div>
            </div>
          </div>
        )}

        <div>
          <h3 className="text-xs font-medium text-muted-foreground uppercase tracking-wider mb-2">
            Findings ({findings.length})
          </h3>
          {findings.length === 0 ? (
            <p className="text-xs text-muted-foreground">No findings for this component.</p>
          ) : (
            <div className="space-y-2">
              {findings.map((f, i) => (
                <motion.div
                  key={f.id}
                  initial={{ opacity: 0, y: 6 }}
                  animate={{ opacity: 1, y: 0 }}
                  transition={{ delay: i * 0.03 }}
                  className="rounded-lg border border-border bg-background/40 p-2.5 hover:border-primary/40 transition-colors"
                >
                  <div className="flex items-center gap-1.5 mb-1">
                    <span className={cn("text-[10px] px-1.5 py-0.5 rounded font-medium", SEVERITY_META[f.severity].color)}>
                      {SEVERITY_META[f.severity].label}
                    </span>
                    <span className="text-xs font-medium leading-snug">{f.title}</span>
                  </div>
                  <p className="text-[11px] text-muted-foreground leading-relaxed mb-1.5">{f.summary}</p>
                  <div className="rounded-md bg-primary/5 border border-primary/15 p-1.5 text-[11px] leading-relaxed">
                    <span className="font-medium text-primary">Fix:</span> {f.recommendation}
                  </div>
                </motion.div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
