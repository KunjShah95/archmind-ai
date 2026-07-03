import { useMemo, useState } from "react";
import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  LineChart, Line, BarChart, Bar, XAxis, YAxis, CartesianGrid, Tooltip,
  ResponsiveContainer, Legend,
} from "recharts";
import { TrendingUp, TrendingDown, Minus, FileText, Award, BarChart3, ArrowUpRight } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { Skeleton } from "@/components/ui/skeleton";
import { AGENTS, overallScore, scoreColor } from "@/lib/types";
import { api } from "@/lib/api";

const AGENT_KEYS = AGENTS.map((a) => a.key);

const CHART_COLORS = [
  "hsl(var(--primary))",
  "#f97316",
  "#22c55e",
  "#a855f7",
  "#eab308",
  "#ec4899",
  "#06b6d4",
];

type ChartPoint = {
  date: string;
  label: string;
  overall: number;
  id: string;
} & Record<string, number>;

export default function ScoreHistory() {
  const [workspaceFilter, setWorkspaceFilter] = useState<string>("all");

  const { data: analyses = [], isLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.listWorkspaces(),
  });

  const filtered = useMemo(() => {
    if (workspaceFilter === "all") return analyses;
    return analyses.filter((a) => a.workspace_id === workspaceFilter);
  }, [analyses, workspaceFilter]);

  const readyAnalyses = useMemo(
    () => filtered.filter((a) => a.status === "ready"),
    [filtered],
  );

  const sorted = useMemo(
    () => [...readyAnalyses].sort(
      (a, b) => new Date(a.uploaded_at).getTime() - new Date(b.uploaded_at).getTime(),
    ),
    [readyAnalyses],
  );

  const chartData: ChartPoint[] = useMemo(
    () => sorted.map((a) => {
      const point: ChartPoint = { date: a.uploaded_at, label: formatDate(a.uploaded_at), overall: overallScore(a.scores), id: a.id };
      for (const key of AGENT_KEYS) {
        point[key] = a.scores[key] ?? 0;
      }
      return point;
    }),
    [sorted],
  );

  const currentScore = sorted.length > 0 ? overallScore(sorted[sorted.length - 1].scores) : 0;
  const bestScore = sorted.length > 0 ? Math.max(...sorted.map((a) => overallScore(a.scores))) : 0;
  const firstScore = sorted.length > 0 ? overallScore(sorted[0].scores) : 0;
  const trend = currentScore - firstScore;

  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Score History"
        description="Track architecture score improvements over time."
        actions={
          <Select value={workspaceFilter} onValueChange={setWorkspaceFilter}>
            <SelectTrigger className="w-48">
              <SelectValue placeholder="All workspaces" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All workspaces</SelectItem>
              {workspaces.map((w) => (
                <SelectItem key={w.id} value={w.id}>{w.name}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        {isLoading ? (
          Array.from({ length: 4 }).map((_, i) => <Skeleton key={i} className="h-28 rounded-xl" />)
        ) : (
          <>
            <StatCard icon={BarChart3} label="Current avg. score" value={String(currentScore)} />
            <StatCard icon={Award} label="Best score" value={String(bestScore)} />
            <StatCard icon={FileText} label="Analyses" value={String(sorted.length)} />
            <StatCard
              icon={trend > 0 ? TrendingUp : trend < 0 ? TrendingDown : Minus}
              label="Overall trend"
              value={trend > 0 ? `+${trend}` : String(trend)}
              tone={trend > 0 ? "success" : trend < 0 ? "danger" : undefined}
            />
          </>
        )}
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-2 gap-4 mt-6">
        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-1">Score timeline</h3>
          <p className="text-xs text-muted-foreground mb-4">Overall architecture score over time</p>
          {chartData.length === 0 ? (
            <div className="h-64 grid place-items-center text-sm text-muted-foreground">No completed analyses yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <LineChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Line
                  type="monotone"
                  dataKey="overall"
                  stroke="hsl(var(--primary))"
                  strokeWidth={2.5}
                  dot={{ r: 4, fill: "hsl(var(--primary))" }}
                  activeDot={{ r: 6 }}
                />
              </LineChart>
            </ResponsiveContainer>
          )}
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold mb-1">Agent breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Per-agent scores per analysis</p>
          {chartData.length === 0 ? (
            <div className="h-64 grid place-items-center text-sm text-muted-foreground">No completed analyses yet</div>
          ) : (
            <ResponsiveContainer width="100%" height={280}>
              <BarChart data={chartData}>
                <CartesianGrid strokeDasharray="3 3" stroke="hsl(var(--border))" />
                <XAxis dataKey="label" tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <YAxis domain={[0, 100]} tick={{ fontSize: 11, fill: "hsl(var(--muted-foreground))" }} />
                <Tooltip
                  contentStyle={{
                    background: "hsl(var(--card))",
                    border: "1px solid hsl(var(--border))",
                    borderRadius: 8,
                    fontSize: 12,
                  }}
                />
                <Legend wrapperStyle={{ fontSize: 11 }} />
                {AGENT_KEYS.map((key, i) => (
                  <Bar
                    key={key}
                    dataKey={key}
                    name={AGENTS[i].name.replace(" Agent", "")}
                    fill={CHART_COLORS[i % CHART_COLORS.length]}
                    stackId="agents"
                  />
                ))}
              </BarChart>
            </ResponsiveContainer>
          )}
        </div>
      </div>

      <div className="rounded-xl border border-border bg-card mt-6">
        <div className="flex items-center justify-between p-5 border-b border-border">
          <div>
            <h3 className="font-display font-semibold">All analyses</h3>
            <p className="text-xs text-muted-foreground">Detailed score breakdown for each analysis</p>
          </div>
          <Link to="/analyses">
            <Button variant="outline" size="sm" className="text-xs">
              View all <ArrowUpRight className="h-3 w-3 ml-1" />
            </Button>
          </Link>
        </div>
        {isLoading && <div className="p-6 text-sm text-muted-foreground">Loading…</div>}
        {!isLoading && sorted.length === 0 && (
          <div className="p-8 text-center text-sm text-muted-foreground">
            No completed analyses yet. <Link to="/upload" className="text-primary hover:underline">Upload your first diagram</Link>
          </div>
        )}
        {sorted.length > 0 && (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="border-b border-border text-xs text-muted-foreground uppercase tracking-wider">
                  <th className="text-left p-4 font-medium">Analysis</th>
                  <th className="text-left p-4 font-medium">Workspace</th>
                  <th className="text-left p-4 font-medium">Date</th>
                  <th className="text-center p-4 font-medium">Overall</th>
                  {AGENTS.map((a) => (
                    <th key={a.key} className="text-center p-4 font-medium">{a.name.replace(" Agent", "")}</th>
                  ))}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {[...sorted].reverse().map((a) => {
                  const total = overallScore(a.scores);
                  return (
                    <tr key={a.id} className="hover:bg-muted/40 transition-colors">
                      <td className="p-4">
                        <Link to={`/analyses/${a.id}`} className="font-medium text-foreground hover:text-primary truncate block max-w-[200px]">
                          {a.name}
                        </Link>
                      </td>
                      <td className="p-4 text-muted-foreground">{a.workspace}</td>
                      <td className="p-4 text-muted-foreground whitespace-nowrap">{new Date(a.uploaded_at).toLocaleDateString()}</td>
                      <td className="p-4 text-center">
                        <span className={scoreColor(total)}>{total}</span>
                      </td>
                      {AGENTS.map((agent) => {
                        const s = a.scores[agent.key] ?? 0;
                        return (
                          <td key={agent.key} className="p-4 text-center">
                            <span className={scoreColor(s)}>{s || "—"}</span>
                          </td>
                        );
                      })}
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        )}
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, tone }: {
  icon: React.ComponentType<{ className?: string }>; label: string; value: string; tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary"}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
    </div>
  );
}

function formatDate(iso: string) {
  const d = new Date(iso);
  return `${d.toLocaleDateString("en-US", { month: "short" })} ${d.getDate()}`;
}
