import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Award,
  Loader2,
  CheckCircle,
  XCircle,
  HelpCircle,
  Play,
  ArrowRight,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { BenchmarkResult } from "@/lib/types";

export default function Benchmarks() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [benchmarkResult, setBenchmarkResult] = useState<BenchmarkResult | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const benchmarkMutation = useMutation({
    mutationFn: (id: string) => api.runArchitectureBenchmark(id),
    onSuccess: (data) => {
      setBenchmarkResult(data);
      toast.success("Benchmark matching complete!");
    },
    onError: () => {
      toast.error("Failed to run architecture benchmark.");
    },
  });

  const handleRunBenchmark = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    setBenchmarkResult(null);
    benchmarkMutation.mutate(selectedId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 70) return "text-emerald-400 border-emerald-500/20 bg-emerald-500/5";
    if (score >= 40) return "text-yellow-400 border-yellow-500/20 bg-yellow-500/5";
    return "text-red-400 border-red-500/20 bg-red-500/5";
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Architecture Benchmarking Suite"
        description="Compare your architecture blueprints with large-scale blueprints from Netflix, Uber, Airbnb, and Shopify to identify missing primitives."
      />

      {/* Select Architecture */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium">Select Target Architecture</Label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setBenchmarkResult(null);
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
          onClick={handleRunBenchmark}
          disabled={!selectedId || benchmarkMutation.isPending}
          className="text-white" style={{ background: "hsl(16 76% 52%)" }}
        >
          {benchmarkMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Matching Patterns...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2 fill-current" />
              Compare Blueprint
            </>
          )}
        </Button>
      </div>

      {benchmarkResult && (
        <div className="space-y-6">
          {/* Similarity Overview */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 flex flex-col md:flex-row items-center justify-between gap-4">
            <div className="space-y-1">
              <h3 className="font-display font-semibold text-lg flex items-center gap-2">
                <Award className="h-5 w-5 text-primary" />
                Industry Blueprint Similarity Analysis
              </h3>
              <p className="text-sm text-muted-foreground max-w-2xl">
                {benchmarkResult.key_recommendation}
              </p>
            </div>
            <div className="text-center p-4 border border-primary/20 rounded-xl bg-card shrink-0">
              <div className="text-3xl font-bold font-display text-primary">
                {benchmarkResult.overall_similarity_pct}%
              </div>
              <div className="text-[10px] text-muted-foreground font-bold tracking-wider uppercase mt-1">
                OVERALL MATCH
              </div>
            </div>
          </div>

          {/* Evaluations Grid */}
          <div className="grid md:grid-cols-2 gap-6">
            {benchmarkResult.pattern_evaluations.map((evalItem) => (
              <div key={evalItem.pattern_key} className="rounded-xl border border-border bg-card p-5 space-y-4 flex flex-col justify-between hover:border-primary/20 transition">
                <div className="space-y-3">
                  <div className="flex items-start justify-between">
                    <div>
                      <h4 className="font-display font-semibold text-base">{evalItem.pattern_name}</h4>
                    </div>
                    <span className={`text-xs px-2.5 py-1 rounded-full font-bold border ${getScoreColor(evalItem.similarity_score_pct)}`}>
                      {evalItem.similarity_score_pct}% Match
                    </span>
                  </div>

                  <p className="text-xs text-muted-foreground leading-relaxed italic">
                    {evalItem.analysis}
                  </p>

                  <div className="grid grid-cols-2 gap-3 pt-2">
                    {/* Matches */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-emerald-400 uppercase tracking-wider">Matched Components</div>
                      {evalItem.matched_features.length > 0 ? (
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          {evalItem.matched_features.map((m, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <CheckCircle className="h-3.5 w-3.5 text-emerald-400 shrink-0" />
                              <span className="truncate">{m}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11px] text-muted-foreground italic">None matched</span>
                      )}
                    </div>

                    {/* Missing */}
                    <div className="space-y-1.5">
                      <div className="text-[10px] font-bold text-red-400 uppercase tracking-wider">Gaps / Missing</div>
                      {evalItem.missing_features.length > 0 ? (
                        <ul className="text-[11px] text-muted-foreground space-y-1">
                          {evalItem.missing_features.map((m, i) => (
                            <li key={i} className="flex items-center gap-1.5">
                              <XCircle className="h-3.5 w-3.5 text-red-400 shrink-0" />
                              <span className="truncate">{m}</span>
                            </li>
                          ))}
                        </ul>
                      ) : (
                        <span className="text-[11px] text-emerald-400 font-medium">Fully covered!</span>
                      )}
                    </div>
                  </div>
                </div>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}
