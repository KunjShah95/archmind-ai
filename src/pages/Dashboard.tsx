import { Link } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { ArrowUpRight, Plus, FileText, Activity, ShieldAlert, TrendingUp } from "lucide-react";
import { MOCK_ANALYSES, overallScore, scoreColor } from "@/lib/mock-data";
import { ScoreRing } from "@/components/ScoreRing";
import { Badge } from "@/components/ui/badge";

export default function Dashboard() {
  const recent = MOCK_ANALYSES;
  return (
    <div className="p-6 md:p-8 max-w-7xl mx-auto">
      <PageHeader
        title="Dashboard"
        description="A snapshot of your team's architecture health."
        actions={
          <Link to="/upload">
            <Button className="bg-gradient-primary text-primary-foreground hover:opacity-90">
              <Plus className="h-4 w-4 mr-1.5" /> New analysis
            </Button>
          </Link>
        }
      />

      <div className="grid grid-cols-1 md:grid-cols-4 gap-4">
        <StatCard icon={FileText} label="Analyses" value="24" change="+4 this week" />
        <StatCard icon={Activity} label="Avg. score" value="76" change="+2 vs last month" />
        <StatCard icon={ShieldAlert} label="Critical findings" value="3" tone="danger" change="2 unresolved" />
        <StatCard icon={TrendingUp} label="Resolved" value="48" change="+12 this month" tone="success" />
      </div>

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4 mt-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card">
          <div className="flex items-center justify-between p-5 border-b border-border">
            <div>
              <h3 className="font-display font-semibold">Recent analyses</h3>
              <p className="text-xs text-muted-foreground">Latest activity across your workspaces</p>
            </div>
            <Link to="/analyses" className="text-xs text-primary hover:underline flex items-center gap-1">
              View all <ArrowUpRight className="h-3 w-3" />
            </Link>
          </div>
          <div className="divide-y divide-border">
            {recent.map((a) => (
              <Link key={a.id} to={`/analyses/${a.id}`} className="flex items-center gap-4 p-4 hover:bg-muted/40 transition-colors">
                <ScoreRing value={overallScore(a.scores)} size={48} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <div className="font-medium truncate">{a.name}</div>
                    <Badge variant="outline" className="text-[10px] font-normal">{a.type}</Badge>
                  </div>
                  <div className="text-xs text-muted-foreground mt-0.5">
                    {a.workspace} · {a.author} · {new Date(a.uploadedAt).toLocaleDateString()}
                  </div>
                </div>
                <StatusPill status={a.status} />
              </Link>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-5">
          <h3 className="font-display font-semibold">Score breakdown</h3>
          <p className="text-xs text-muted-foreground mb-4">Across all ready analyses</p>
          <div className="space-y-3">
            {(["scalability","security","reliability","performance","cost","maintainability","observability"] as const).map((k) => {
              const avg = Math.round(
                recent.filter((a) => a.status === "ready").reduce((s, a) => s + a.scores[k], 0) /
                Math.max(1, recent.filter((a) => a.status === "ready").length)
              );
              return (
                <div key={k}>
                  <div className="flex justify-between text-xs mb-1">
                    <span className="capitalize">{k}</span>
                    <span className={scoreColor(avg)}>{avg}</span>
                  </div>
                  <div className="h-1.5 rounded bg-muted overflow-hidden">
                    <div
                      className="h-full bg-gradient-primary"
                      style={{ width: `${avg}%` }}
                    />
                  </div>
                </div>
              );
            })}
          </div>
        </div>
      </div>
    </div>
  );
}

function StatCard({ icon: Icon, label, value, change, tone }: {
  icon: any; label: string; value: string; change?: string; tone?: "success" | "danger";
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-5">
      <div className="flex items-center justify-between">
        <span className="text-xs text-muted-foreground">{label}</span>
        <Icon className={`h-4 w-4 ${tone === "danger" ? "text-danger" : tone === "success" ? "text-success" : "text-primary"}`} />
      </div>
      <div className="mt-3 font-display text-3xl font-semibold tracking-tight">{value}</div>
      {change && <div className="mt-1 text-xs text-muted-foreground">{change}</div>}
    </div>
  );
}

function StatusPill({ status }: { status: string }) {
  const map: Record<string, string> = {
    ready: "bg-success/10 text-success border-success/20",
    analyzing: "bg-primary/10 text-primary border-primary/20",
    queued: "bg-muted text-muted-foreground border-border",
    failed: "bg-danger/10 text-danger border-danger/20",
  };
  return (
    <span className={`text-[10px] uppercase tracking-wider px-2 py-1 rounded border ${map[status]}`}>
      {status}
    </span>
  );
}
