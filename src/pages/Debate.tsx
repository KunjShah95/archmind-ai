import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  MessageSquare,
  Loader2,
  Users,
  CheckCircle,
  HelpCircle,
  Plus,
  ArrowRight,
  TrendingUp,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { DebateResult } from "@/lib/types";

const SUGGESTED_DILEMMAS = [
  "Should we migrate from PostgreSQL with read replicas to CockroachDB for multi-region active-active?",
  "Should we replace RabbitMQ with AWS SQS for event delivery to decrease operational overhead?",
  "Should we migrate our monolithic orders backend to microservices using Kubernetes?",
  "Should we use Apollo GraphQL Gateway instead of REST API Gateway for frontend client aggregations?",
];

const AGENT_COLORS: Record<string, string> = {
  "Scalability Agent": "border-sky-500/30 bg-sky-500/5 text-sky-400",
  "Security Agent": "border-rose-500/30 bg-rose-500/5 text-rose-400",
  "Cost Agent": "border-emerald-500/30 bg-emerald-500/5 text-emerald-400",
  "DevOps Agent": "border-amber-500/30 bg-amber-500/5 text-amber-400",
};

export default function Debate() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [topic, setTopic] = useState("");
  const [debateResult, setDebateResult] = useState<DebateResult | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const debateMutation = useMutation({
    mutationFn: ({ id, topicText }: { id: string; topicText: string }) =>
      api.runMultiAgentDebate(id, topicText),
    onSuccess: (data) => {
      setDebateResult(data);
      toast.success("Debate complete!");
    },
    onError: () => {
      toast.error("Failed to run debate simulator.");
    },
  });

  const handleStartDebate = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    if (!topic.trim()) {
      toast.error("Please specify a debate topic or select a suggestion.");
      return;
    }
    setDebateResult(null);
    debateMutation.mutate({ id: selectedId, topicText: topic });
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Multi-Agent Architectural Debate"
        description="Run simulated design review sessions. Watch Scalability, Security, Cost, and DevOps agents debate trade-offs on any architectural dilemma."
      />

      {/* Select context & topic input */}
      <div className="rounded-xl border border-border bg-card p-6 space-y-5 shadow-sm">
        <div className="grid md:grid-cols-2 gap-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">Select Context Architecture</Label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setDebateResult(null);
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

          <div className="space-y-2">
            <Label className="text-sm font-medium">Design dilemma or trade-off topic</Label>
            <Input
              value={topic}
              onChange={(e) => setTopic(e.target.value)}
              placeholder="e.g. AWS SQS vs Self-hosted RabbitMQ"
              className="h-10 bg-background/60"
            />
          </div>
        </div>

        {/* Suggestions */}
        <div className="space-y-2">
          <span className="text-xs font-semibold text-muted-foreground uppercase">Suggested Dilemmas</span>
          <div className="flex flex-wrap gap-1.5">
            {SUGGESTED_DILEMMAS.map((d, idx) => (
              <button
                key={idx}
                type="button"
                onClick={() => {
                  setTopic(d);
                  setDebateResult(null);
                }}
                className="text-[11px] px-3 py-1.5 rounded-full border border-border bg-muted/40 hover:bg-muted text-muted-foreground hover:text-foreground text-left transition"
              >
                {d.length > 80 ? d.slice(0, 80) + "..." : d}
              </button>
            ))}
          </div>
        </div>

        <div className="flex justify-end">
          <Button
            size="lg"
            onClick={handleStartDebate}
            disabled={!selectedId || !topic.trim() || debateMutation.isPending}
            className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow px-6"
          >
            {debateMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                Debating Trade-offs...
              </>
            ) : (
              <>
                <MessageSquare className="h-4 w-4 mr-2" />
                Initiate Debate
              </>
            )}
          </Button>
        </div>
      </div>

      {debateResult && (
        <div className="space-y-6">
          {/* Debate Transcript */}
          <div className="space-y-4">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <Users className="h-5 w-5 text-primary" />
              Debate Transcript
            </h3>
            <div className="space-y-4">
              {debateResult.debate_transcript.map((turn, i) => {
                const colorClass = AGENT_COLORS[turn.agent] || "border-border bg-card/60";
                return (
                  <div
                    key={i}
                    className={`p-5 rounded-xl border ${colorClass} space-y-2 transition`}
                  >
                    <div className="text-xs font-bold uppercase tracking-wider">
                      {turn.agent}
                    </div>
                    <p className="text-sm leading-relaxed text-muted-foreground">
                      {turn.argument}
                    </p>
                  </div>
                );
              })}
            </div>
          </div>

          {/* Consensus Recommendation */}
          <div className="rounded-xl border border-emerald-500/20 bg-emerald-500/5 p-6 space-y-3">
            <h4 className="font-display font-semibold text-emerald-400 flex items-center gap-2">
              <CheckCircle className="h-5 w-5" />
              Board Coordinated Consensus
            </h4>
            <p className="text-sm text-muted-foreground leading-relaxed">
              {debateResult.consensus_recommendation}
            </p>
          </div>

          {/* Comparison Trade-off Matrix */}
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h4 className="font-display font-semibold text-sm">Trade-off Comparison Matrix</h4>
            <div className="grid md:grid-cols-2 gap-4">
              {debateResult.trade_off_matrix.map((matrix, idx) => (
                <div key={idx} className="rounded-lg border border-border/80 p-4 space-y-3 bg-background/40">
                  <div className="text-sm font-bold text-primary">{matrix.option}</div>
                  <div className="grid grid-cols-2 gap-2 text-xs">
                    <div className="space-y-1">
                      <div className="font-bold text-emerald-400">PROS</div>
                      <ul className="list-disc pl-3.5 space-y-1 text-muted-foreground">
                        {matrix.pros.map((pro, i) => (
                          <li key={i}>{pro}</li>
                        ))}
                      </ul>
                    </div>
                    <div className="space-y-1">
                      <div className="font-bold text-red-400">CONS</div>
                      <ul className="list-disc pl-3.5 space-y-1 text-muted-foreground">
                        {matrix.cons.map((con, i) => (
                          <li key={i}>{con}</li>
                        ))}
                      </ul>
                    </div>
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
