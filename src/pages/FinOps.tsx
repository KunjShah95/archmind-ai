import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ResponsiveContainer,
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  CartesianGrid,
} from "recharts";
import {
  DollarSign,
  TrendingDown,
  ChevronRight,
  TrendingUp,
  Loader2,
  Trash2,
  Play,
  Lightbulb,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

export default function FinOps() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [finopsData, setFinopsData] = useState<any>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const finopsMutation = useMutation({
    mutationFn: (id: string) => api.getFinOpsAnalysis(id),
    onSuccess: (data) => {
      setFinopsData(data);
      toast.success("FinOps cost calculations ready!");
    },
    onError: () => {
      toast.error("Failed to run FinOps audit.");
    },
  });

  const handleRunFinOps = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    setFinopsData(null);
    finopsMutation.mutate(selectedId);
  };

  const chartData = finopsData
    ? [
        { name: "Current Spend", Cost: finopsData.monthly_projections.current_monthly_usd },
        { name: "Next Month (Est.)", Cost: finopsData.monthly_projections.next_month_projected_usd },
        { name: "Next Year (Est.)", Cost: finopsData.monthly_projections.next_year_projected_usd },
      ]
    : [];

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="FinOps Cost Optimizer"
        description="Forecast infrastructure budgets. Spot billing anomalies, optimize VM rightsizing, and review spot instances deployment scenarios."
      />

      {/* Select Architecture */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium">Select Target Architecture</Label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setFinopsData(null);
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
        <Button
          size="lg"
          onClick={handleRunFinOps}
          disabled={!selectedId || finopsMutation.isPending}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow shrink-0 h-10"
        >
          {finopsMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Auditing Costs...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2 fill-current" />
              Calculate Cost Profile
            </>
          )}
        </Button>
      </div>

      {finopsData && (
        <div className="space-y-6">
          {/* Key Metrics Row */}
          <div className="grid sm:grid-cols-4 gap-4">
            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Current Spend</div>
              <div className="text-2xl font-bold font-display">${finopsData.monthly_projections.current_monthly_usd}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Next Month Projected</div>
              <div className="text-2xl font-bold font-display">${finopsData.monthly_projections.next_month_projected_usd}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
            </div>
            <div className="rounded-xl border border-border bg-card p-5 space-y-1">
              <div className="text-[10px] text-muted-foreground uppercase font-bold tracking-wider">Next Year Projected</div>
              <div className="text-2xl font-bold font-display">${finopsData.monthly_projections.next_year_projected_usd}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
            </div>
            <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-5 space-y-1">
              <div className="text-[10px] text-emerald-400 uppercase font-bold tracking-wider">Potential Savings</div>
              <div className="text-2xl font-bold font-display text-emerald-400">${finopsData.monthly_projections.potential_savings_monthly_usd}<span className="text-xs text-muted-foreground font-normal">/mo</span></div>
            </div>
          </div>

          <div className="grid lg:grid-cols-2 gap-6">
            {/* Cost chart */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <TrendingUp className="h-4.5 w-4.5 text-primary" />
                <h4 className="font-display font-semibold text-sm">Budget Growth Forecast</h4>
              </div>
              <div className="h-[240px]">
                <ResponsiveContainer width="100%" height="100%">
                  <BarChart data={chartData} margin={{ top: 10, right: 10, left: -20, bottom: 0 }}>
                    <CartesianGrid strokeDasharray="3 3" vertical={false} stroke="hsl(var(--border))" />
                    <XAxis dataKey="name" stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <YAxis stroke="hsl(var(--muted-foreground))" fontSize={11} tickLine={false} />
                    <Tooltip contentStyle={{ background: "hsl(var(--card))", borderColor: "hsl(var(--border))" }} />
                    <Bar dataKey="Cost" fill="hsl(var(--primary))" radius={[4, 4, 0, 0]} name="Monthly Cost ($)" />
                  </BarChart>
                </ResponsiveContainer>
              </div>
            </div>

            {/* Waste Panel */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-4">
              <div className="flex items-center gap-2">
                <Trash2 className="h-4.5 w-4.5 text-red-400" />
                <h4 className="font-display font-semibold text-sm">Identified Waste & Idle Assets</h4>
              </div>
              <div className="space-y-3 max-h-[240px] overflow-y-auto pr-1">
                {finopsData.waste_analysis.length > 0 ? (
                  finopsData.waste_analysis.map((w: any, idx: number) => (
                    <div key={idx} className="p-3 rounded-lg border border-border bg-background/50 space-y-1">
                      <div className="flex justify-between text-xs font-bold">
                        <span>{w.component}</span>
                        <span className="text-emerald-400">Save ${w.potential_savings_monthly_usd}/mo</span>
                      </div>
                      <p className="text-xs text-muted-foreground">{w.issue}</p>
                      <p className="text-[10px] text-primary mt-1 border-t border-border/40 pt-1 font-semibold flex items-center gap-1">
                        <Lightbulb className="h-3 w-3" />
                        *Opt:* {w.opportunity}
                      </p>
                    </div>
                  ))
                ) : (
                  <p className="text-xs text-muted-foreground">No structural resource idle waste was detected.</p>
                )}
              </div>
            </div>
          </div>

          {/* Rightsizing & Spot Table */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h4 className="font-display font-semibold text-sm flex items-center gap-2">
              <TrendingDown className="h-4.5 w-4.5 text-emerald-400" />
              Instance Rightsizing Recommendations
            </h4>
            <div className="divide-y divide-border/60">
              {finopsData.rightsizing_opportunities.map((ro: any, i: number) => (
                <div key={i} className="py-3 first:pt-0 last:pb-0 grid md:grid-cols-4 gap-2 text-xs">
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Resource</span>
                    <span className="font-semibold text-foreground">{ro.resource}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rightsizing Action</span>
                    <span className="text-red-400 line-through">{ro.current_sku}</span>
                    <ChevronRight className="inline-block h-3 w-3 mx-1 text-muted-foreground" />
                    <span className="text-emerald-400 font-semibold">{ro.recommended_sku}</span>
                  </div>
                  <div>
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Rationale</span>
                    <span className="text-muted-foreground">{ro.rationale}</span>
                  </div>
                  <div className="text-right">
                    <span className="text-[10px] uppercase font-bold text-muted-foreground block">Savings</span>
                    <span className="font-bold text-emerald-400 text-sm">${ro.monthly_savings_usd}/mo</span>
                  </div>
                </div>
              ))}
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
