import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer,
  AreaChart,
  Area,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
  BarChart,
  Bar,
  Legend,
} from "recharts";
import {
  Play,
  Loader2,
  TrendingUp,
  Activity,
  DollarSign,
  Cpu,
  Layers,
  AlertTriangle,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { SimulationResult } from "@/lib/types";

export default function Simulation() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";
  
  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [simResult, setSimResult] = useState<SimulationResult | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const activeAnalysis = analyses.find((a) => a.id === selectedId);

  const simulateMutation = useMutation({
    mutationFn: (id: string) => api.simulateTraffic(id),
    onSuccess: (data) => {
      setSimResult(data);
      toast.success("Simulation complete!");
    },
    onError: () => {
      toast.error("Failed to run traffic simulation.");
    },
  });

  const handleSimulate = () => {
    if (!selectedId) {
      toast.error("Please select an architecture to simulate.");
      return;
    }
    setSimResult(null);
    simulateMutation.mutate(selectedId);
  };

  // Prepare chart data
  const chartData = simResult
    ? Object.entries(simResult.results).map(([scale, details]) => ({
        scale,
        RPS: details.throughput_rps,
        p50: details.latency_p50_ms,
        p95: details.latency_p95_ms,
        p99: details.latency_p99_ms,
        Cost: details.infra_cost_monthly_usd,
        Instances: details.autoscaling_instances,
        bottlenecks: details.bottlenecks,
      }))
    : [];

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8">
      <PageHeader
        title="Traffic Simulation Engine"
        description="Predict latency, autoscaling thresholds, costs, and hardware bottlenecks under simulated user loads from 1K to 100M users."
      />

      {/* Select Architecture */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium">Select Target Architecture</Label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setSimResult(null);
            }}
            className="w-full h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition text-sm focus:outline-none focus:ring-1 focus:ring-primary"
          >
            <option value="">-- Choose an Architecture --</option>
            {analyses.map((a) => (
              <option key={a.id} value={a.id}>
                {a.name} ({a.diagram_type || "Diagram"})
              </option>
            ))}
          </select>
        </div>
        <Button
          size="lg"
          onClick={handleSimulate}
          disabled={!selectedId || simulateMutation.isPending}
          className="text-white" style={{ background: "hsl(16 76% 52%)" }}
        >
          {simulateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Simulating Traffic...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2 fill-current" />
              Run Simulation
            </>
          )}
        </Button>
      </div>

      {simResult && (
        <div className="space-y-6">
          {/* Summary Panel */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-2">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Activity className="h-5 w-5 text-primary" />
              Scaling Projection Summary
            </h3>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {simResult.summary}
            </p>
          </div>

          {/* Scale Detail Grid */}
          <div className="grid sm:grid-cols-2 lg:grid-cols-5 gap-4">
            {Object.entries(simResult.results).map(([scale, details]) => (
              <div key={scale} className="rounded-xl border border-border bg-card p-5 space-y-3 relative hover:border-primary/20 transition">
                <div className="text-xs font-bold text-muted-foreground tracking-wider uppercase">
                  {scale} Users
                </div>
                <div className="space-y-1">
                  <div className="text-2xl font-bold font-display text-primary">
                    {details.throughput_rps.toLocaleString()} <span className="text-xs text-muted-foreground font-normal">RPS</span>
                  </div>
                  <div className="text-sm font-semibold flex items-center gap-1">
                    <TrendingUp className="h-3.5 w-3.5 text-warning" />
                    p95: {details.latency_p95_ms}ms
                  </div>
                </div>
                <div className="pt-2.5 border-t border-border/60 text-xs space-y-1 text-muted-foreground">
                  <div className="flex justify-between">
                    <span>Monthly Cost:</span>
                    <span className="font-semibold text-foreground">${details.infra_cost_monthly_usd}</span>
                  </div>
                  <div className="flex justify-between">
                    <span>Instances:</span>
                    <span className="font-semibold text-foreground">{details.autoscaling_instances} VMs</span>
                  </div>
                </div>
                {details.bottlenecks.length > 0 && details.bottlenecks[0] !== "No immediate critical bottlenecks" && (
                  <div className="pt-2 border-t border-border/60">
                    <div className="text-[10px] font-bold text-red-400 flex items-center gap-1">
                      <AlertTriangle className="h-3 w-3" />
                      BOTTLENECKS
                    </div>
                    <ul className="text-[10px] text-muted-foreground list-disc pl-3 mt-1 leading-normal">
                      {details.bottlenecks.map((b, i) => (
                        <li key={i}>{b}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            ))}
          </div>

          {/* Recharts Performance Visualizations */}
          <div className="grid lg:grid-cols-2 gap-6">
            {/* Latency Chart */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Activity className="h-5 w-5 text-violet-400" />
                <h4 className="font-display font-semibold">Latency Profile (ms)</h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <AreaChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <defs>
                      <linearGradient id="colorP95" x1="0" y1="0" x2="0" y2="1">
                        <stop offset="5%" stopColor="hsl(var(--warning))" stopOpacity={0.2} />
                        <stop offset="95%" stopColor="hsl(var(--warning))" stopOpacity={0} />
                      </linearGradient>
                    </defs>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="scale" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Legend />
                    <Area type="monotone" dataKey="p50" stroke="hsl(var(--primary))" fillOpacity={0} strokeWidth={2} name="p50 (Median)" />
                    <Area type="monotone" dataKey="p95" stroke="hsl(var(--warning))" fill="url(#colorP95)" strokeWidth={2} name="p95 (Tail)" />
                    <Area type="monotone" dataKey="p99" stroke="red" fillOpacity={0} strokeWidth={1.5} strokeDasharray="4 4" name="p99 (Peak)" />
                  </AreaChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Cost & Instances Chart */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <DollarSign className="h-5 w-5 text-emerald-400" />
                <h4 className="font-display font-semibold">Infrastructure Resource Scaling</h4>
              </div>
              <div className="h-[280px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="scale" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="left" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis yAxisId="right" orientation="right" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Legend />
                    <Bar yAxisId="left" dataKey="Cost" fill="hsl(var(--success))" radius={[4, 4, 0, 0]} name="Cost ($/mo)" />
                    <Bar yAxisId="right" dataKey="Instances" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Autoscale Instances" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
