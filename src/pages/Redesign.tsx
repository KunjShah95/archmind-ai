import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery, useMutation } from "@tanstack/react-query";
import { motion, AnimatePresence } from "framer-motion";
import ReactFlow, { Background, Controls, MiniMap } from "reactflow";
import "reactflow/dist/style.css";
import {
  DollarSign, Gauge, HeartPulse, Building2, Rocket, Globe,
  ArrowRight, Loader2, Plus, Minus, Pencil, ArrowLeft,
  TrendingUp, TrendingDown, Minus as Neutral, CheckCircle2,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";
import type { RedesignResult, RedesignStrategy } from "@/lib/types";
import { cn } from "@/lib/utils";
import type { LucideIcon } from "lucide-react";

const STRATEGY_ICONS: Record<string, LucideIcon> = {
  DollarSign, Gauge, HeartPulse, Building: Building2, Rocket, Globe,
};

const CHANGE_ICONS = {
  added: { icon: Plus, color: "text-emerald-400", bg: "bg-emerald-500/10" },
  removed: { icon: Minus, color: "text-rose-400", bg: "bg-rose-500/10" },
  modified: { icon: Pencil, color: "text-amber-400", bg: "bg-amber-500/10" },
};

const IMPACT_ICONS = {
  positive: { icon: TrendingUp, color: "text-emerald-400" },
  negative: { icon: TrendingDown, color: "text-rose-400" },
  neutral: { icon: Neutral, color: "text-muted-foreground" },
};

export default function Redesign() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const [selectedStrategy, setSelectedStrategy] = useState<string | null>(null);
  const [result, setResult] = useState<RedesignResult | null>(null);

  const { data: analysis } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: !!id,
  });

  const { data: strategies = [] } = useQuery({
    queryKey: ["redesign-strategies"],
    queryFn: () => api.getRedesignStrategies(),
  });

  const redesignMutation = useMutation({
    mutationFn: (strategy: string) => api.redesignArchitecture(id!, strategy),
    onSuccess: (data) => {
      setResult(data);
      toast.success("Architecture redesigned!", {
        description: `${data.changes.length} changes applied with ${data.trade_offs.length} trade-offs.`,
      });
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError ? err.message : "Redesign failed"
      );
    },
  });

  const handleRedesign = (strategy: string) => {
    setSelectedStrategy(strategy);
    setResult(null);
    redesignMutation.mutate(strategy);
  };

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <div className="flex items-center gap-3 mb-6">
        <Button
          variant="ghost"
          size="icon"
          className="h-8 w-8"
          onClick={() => navigate(-1)}
        >
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Architecture Redesign"
          description={
            analysis
              ? `Optimize "${analysis.name}" with one-click redesign strategies`
              : "Loading..."
          }
        />
      </div>

      {/* Strategy Cards */}
      <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-4">
        {strategies.map((strategy: RedesignStrategy) => {
          const IconComp = STRATEGY_ICONS[strategy.icon] || Gauge;
          const isSelected = selectedStrategy === strategy.key;
          const isLoading =
            redesignMutation.isPending && selectedStrategy === strategy.key;

          return (
            <motion.button
              key={strategy.key}
              type="button"
              whileHover={{ scale: 1.02 }}
              whileTap={{ scale: 0.98 }}
              onClick={() => handleRedesign(strategy.key)}
              disabled={redesignMutation.isPending}
              className={cn(
                "relative rounded-xl border p-5 text-left transition-all",
                isSelected
                  ? "border-primary bg-primary/5 ring-1 ring-primary/20 shadow-lg"
                  : "border-border bg-card/60 hover:bg-card hover:border-primary/30"
              )}
            >
              <div
                className={cn(
                  "h-10 w-10 rounded-lg grid place-items-center mb-3",
                  `bg-gradient-to-br ${strategy.accent}`
                )}
              >
                <IconComp className="h-5 w-5 text-white" />
              </div>
              <h3 className="font-display font-semibold">{strategy.name}</h3>
              <p className="text-sm text-muted-foreground mt-1">
                {strategy.description}
              </p>
              {isLoading && (
                <div className="absolute inset-0 rounded-xl bg-background/60 backdrop-blur-sm grid place-items-center">
                  <Loader2 className="h-6 w-6 animate-spin text-primary" />
                </div>
              )}
            </motion.button>
          );
        })}
      </div>

      {/* Results */}
      <AnimatePresence>
        {result && (
          <motion.div
            initial={{ opacity: 0, y: 30 }}
            animate={{ opacity: 1, y: 0 }}
            exit={{ opacity: 0, y: -20 }}
            className="mt-8 space-y-6"
          >
            {/* Summary */}
            <div className="rounded-xl border border-primary/20 bg-primary/5 p-5">
              <div className="flex items-center gap-2 mb-2">
                <CheckCircle2 className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold">Redesign Summary</h3>
              </div>
              <p className="text-sm text-muted-foreground">{result.summary}</p>
            </div>

            {/* Side-by-side diagrams */}
            <div className="grid lg:grid-cols-2 gap-4">
              <div className="rounded-xl border border-border bg-card overflow-hidden">
                <div className="px-4 py-2.5 border-b border-border bg-muted/30">
                  <span className="text-sm font-medium text-muted-foreground">
                    Original Architecture
                  </span>
                </div>
                <div className="h-[350px]">
                  <ReactFlow
                    nodes={result.original_nodes}
                    edges={result.original_edges}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background gap={16} size={1} color="hsl(var(--muted-foreground) / 0.08)" />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
              </div>

              <div className="rounded-xl border border-primary/30 bg-card overflow-hidden ring-1 ring-primary/10">
                <div className="px-4 py-2.5 border-b border-primary/20 bg-primary/5">
                  <span className="text-sm font-medium text-primary">
                    Redesigned Architecture
                  </span>
                </div>
                <div className="h-[350px]">
                  <ReactFlow
                    nodes={result.redesigned_nodes}
                    edges={result.redesigned_edges}
                    fitView
                    nodesDraggable={false}
                    nodesConnectable={false}
                    elementsSelectable={false}
                    proOptions={{ hideAttribution: true }}
                  >
                    <Background gap={16} size={1} color="hsl(var(--primary) / 0.06)" />
                    <Controls showInteractive={false} />
                  </ReactFlow>
                </div>
              </div>
            </div>

            {/* Changes & Trade-offs */}
            <div className="grid lg:grid-cols-2 gap-4">
              {/* Changes */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h4 className="font-display font-semibold mb-3">Changes</h4>
                <div className="space-y-2.5">
                  {result.changes.map((change, i) => {
                    const meta =
                      CHANGE_ICONS[change.type as keyof typeof CHANGE_ICONS] ||
                      CHANGE_ICONS.modified;
                    const ChangeIcon = meta.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3"
                      >
                        <div
                          className={cn(
                            "h-7 w-7 rounded-md grid place-items-center shrink-0",
                            meta.bg
                          )}
                        >
                          <ChangeIcon className={cn("h-3.5 w-3.5", meta.color)} />
                        </div>
                        <div className="min-w-0">
                          <div className="text-sm font-medium flex items-center gap-2">
                            <span className="capitalize text-xs px-1.5 py-0.5 rounded bg-muted text-muted-foreground">
                              {change.type}
                            </span>
                            {change.component}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {change.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>

              {/* Trade-offs */}
              <div className="rounded-xl border border-border bg-card p-5">
                <h4 className="font-display font-semibold mb-3">Trade-offs</h4>
                <div className="space-y-2.5">
                  {result.trade_offs.map((tradeoff, i) => {
                    const meta =
                      IMPACT_ICONS[
                        tradeoff.impact as keyof typeof IMPACT_ICONS
                      ] || IMPACT_ICONS.neutral;
                    const ImpactIcon = meta.icon;
                    return (
                      <div
                        key={i}
                        className="flex items-start gap-3 rounded-lg border border-border bg-background/60 p-3"
                      >
                        <ImpactIcon
                          className={cn("h-4 w-4 mt-0.5 shrink-0", meta.color)}
                        />
                        <div className="min-w-0">
                          <div className="text-sm font-medium">
                            {tradeoff.aspect}
                          </div>
                          <p className="text-xs text-muted-foreground mt-0.5">
                            {tradeoff.description}
                          </p>
                        </div>
                      </div>
                    );
                  })}
                </div>
              </div>
            </div>
          </motion.div>
        )}
      </AnimatePresence>
    </div>
  );
}
