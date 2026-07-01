import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Flame,
  Loader2,
  AlertOctagon,
  Clock,
  CheckCircle,
  HelpCircle,
  Play,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { ChaosResult } from "@/lib/types";

export default function FailureSimulator() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [targetNodeId, setTargetNodeId] = useState<string>("");
  const [chaosResult, setChaosResult] = useState<ChaosResult | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const { data: activeDetail } = useQuery({
    queryKey: ["analysis", selectedId],
    queryFn: () => api.getAnalysis(selectedId),
    enabled: !!selectedId,
  });

  const simulateMutation = useMutation({
    mutationFn: ({ id, nodeId }: { id: string; nodeId: string }) =>
      api.simulateFailure(id, nodeId),
    onSuccess: (data) => {
      setChaosResult(data);
      toast.success("Chaos simulation calculated!");
    },
    onError: () => {
      toast.error("Failed to run failure simulation.");
    },
  });

  const handleSimulate = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    if (!targetNodeId) {
      toast.error("Please select a target component to crash.");
      return;
    }
    setChaosResult(null);
    simulateMutation.mutate({ id: selectedId, nodeId: targetNodeId });
  };

  const getSeverityBadge = (severity: string) => {
    const styles: Record<string, string> = {
      critical: "bg-red-500/10 text-red-400 border border-red-500/20",
      high: "bg-orange-500/10 text-orange-400 border border-orange-500/20",
      medium: "bg-yellow-500/10 text-yellow-400 border border-yellow-500/20",
      low: "bg-blue-500/10 text-blue-400 border border-blue-500/20",
    };
    return styles[severity] || styles.medium;
  };

  const nodes = activeDetail?.diagram_nodes || [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Chaos Failure Simulator"
        description="Trigger architectural failures locally. Simulate database crashes, cache wipeouts, or regional network dropouts to discover cascade pathways."
      />

      <div className="rounded-xl border border-border bg-card p-6 gap-6 grid md:grid-cols-2 shadow-sm">
        {/* Step 1: Select Architecture */}
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Select Architecture</Label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setTargetNodeId("");
                setChaosResult(null);
              }}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose an Architecture --</option>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          {/* Step 2: Select Node to Crash */}
          {selectedId && (
            <div className="space-y-2">
              <Label className="text-sm font-medium">2. Select Component to Kill</Label>
              <div className="grid grid-cols-2 gap-2 max-h-[220px] overflow-y-auto pr-1">
                {nodes.map((node) => {
                  const isTarget = targetNodeId === node.id;
                  const isBlastNode =
                    chaosResult?.blast_radius_node_ids.includes(node.id) &&
                    !isTarget;

                  return (
                    <button
                      key={node.id}
                      type="button"
                      onClick={() => {
                        setTargetNodeId(node.id);
                        setChaosResult(null);
                      }}
                      className={`flex items-center justify-between px-3 py-2 rounded-lg border text-xs text-left transition ${
                        isTarget
                          ? "border-red-500 bg-red-500/10 text-red-400 font-bold"
                          : isBlastNode
                          ? "border-orange-500/40 bg-orange-500/5 text-orange-400"
                          : "border-border bg-background hover:border-red-500/40"
                      }`}
                    >
                      <span className="truncate">{node.data.label}</span>
                      {isTarget && <Flame className="h-3.5 w-3.5 text-red-500 animate-pulse" />}
                    </button>
                  );
                })}
              </div>
            </div>
          )}
        </div>

        {/* Step 3: Trigger Chaos */}
        <div className="flex flex-col justify-between p-4 border border-dashed border-border rounded-lg bg-muted/10">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <AlertOctagon className="h-4 w-4 text-red-500" />
              Failure Injection Panel
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              Crashing a component causes downstream consumers to timeout, saturate, or fail over. Simulation predicts the propagation path and checks your defensive posture.
            </p>
          </div>
          <Button
            size="lg"
            variant="destructive"
            onClick={handleSimulate}
            disabled={!selectedId || !targetNodeId || simulateMutation.isPending}
            className="w-full mt-4 bg-red-600 hover:bg-red-700 text-white font-bold"
          >
            {simulateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Calculating Cascade...
              </>
            ) : (
              <>
                <Play className="h-4 w-4 mr-2 fill-current" />
                Inject Failure
              </>
            )}
          </Button>
        </div>
      </div>

      {chaosResult && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Incident Overview */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4">
              <div className="flex items-start justify-between">
                <div>
                  <h3 className="font-display font-semibold text-lg">
                    Blast Radius Assessment
                  </h3>
                  <p className="text-xs text-muted-foreground mt-0.5">
                    Affected nodes: {chaosResult.blast_radius_node_ids.length} / {nodes.length}
                  </p>
                </div>
                <span
                  className={`text-xs px-2.5 py-1 rounded-full uppercase font-semibold ${getSeverityBadge(
                    chaosResult.severity
                  )}`}
                >
                  {chaosResult.severity} Severity
                </span>
              </div>

              <div className="text-sm text-muted-foreground border-l-2 border-primary/40 pl-4 py-1 italic">
                {chaosResult.summary}
              </div>

              {/* Cascade Path */}
              {chaosResult.cascading_failures.length > 0 ? (
                <div className="space-y-2">
                  <h4 className="text-xs font-bold text-muted-foreground uppercase tracking-wider">
                    Downstream Cascade Chain
                  </h4>
                  <div className="space-y-2">
                    {chaosResult.cascading_failures.map((cf, idx) => {
                      const nName =
                        nodes.find((x) => x.id === cf.node_id)?.data.label ||
                        cf.node_id;
                      return (
                        <div
                          key={idx}
                          className="flex items-start gap-2.5 p-3 rounded-lg border border-border/60 bg-muted/20"
                        >
                          <span className="text-xs text-red-400 font-mono mt-0.5">
                            {idx + 1}.
                          </span>
                          <div>
                            <div className="text-sm font-semibold">{nName}</div>
                            <div className="text-xs text-muted-foreground mt-0.5">
                              {cf.reason}
                            </div>
                          </div>
                        </div>
                      );
                    })}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-3 rounded-lg border border-emerald-500/10 bg-emerald-500/5 text-emerald-400 text-sm">
                  <CheckCircle className="h-4 w-4" />
                  No secondary cascading failures detected! Failure is properly contained.
                </div>
              )}
            </div>
          </div>

          {/* SRE Mitigation Panel */}
          <div className="space-y-6">
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Clock className="h-4.5 w-4.5 text-primary" />
                <h4 className="font-display font-semibold">Incident Recovery</h4>
              </div>
              <div className="space-y-1">
                <div className="text-xs text-muted-foreground">Estimated MTTR:</div>
                <div className="text-lg font-bold font-display">{chaosResult.recovery_time_estimation}</div>
              </div>
            </div>

            <div className="rounded-xl border border-border bg-card p-5 space-y-3">
              <h4 className="font-display font-semibold text-sm">Mitigation & Hardening</h4>
              <ul className="space-y-2.5 text-xs text-muted-foreground">
                {chaosResult.mitigation_strategies.map((strat, i) => (
                  <li key={i} className="flex gap-2 items-start">
                    <span className="h-1.5 w-1.5 rounded-full bg-primary shrink-0 mt-1.5" />
                    <span>{strat}</span>
                  </li>
                ))}
              </ul>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
