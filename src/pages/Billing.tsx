import { Link } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Check, Download } from "lucide-react";
import { api } from "@/lib/api";

export default function Billing() {
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboardStats(),
  });

  const plan = stats?.plan ?? "hobby";
  const isPaid = plan !== "hobby";

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="Billing"
        description="Manage your plan, payment method, and invoices."
        actions={<Link to="/pricing"><Button variant="outline">Change plan</Button></Link>}
      />

      <div className="grid lg:grid-cols-3 gap-4 mb-6">
        <div className="lg:col-span-2 rounded-xl border border-border bg-card p-6">
          <div className="flex items-center justify-between">
            <div>
              <div className="text-xs uppercase tracking-wider text-muted-foreground">Current plan</div>
              <div className="mt-1 font-display text-2xl font-semibold capitalize">{plan}</div>
            </div>
            <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">Active</Badge>
          </div>
          <div className="mt-5 grid sm:grid-cols-3 gap-3">
            <Stat label="Analyses used" value={`${stats?.analyses_used ?? 0} / ${stats?.analyses_limit ?? 10}`} />
            <Stat label="Total analyses" value={String(stats?.total_analyses ?? 0)} />
            <Stat label="Avg. score" value={String(stats?.avg_score ?? 0)} />
          </div>
          <div className="mt-6 flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
            {(isPaid
              ? ["Unlimited analyses", "All agents", "Compare mode", "RBAC", "Priority support"]
              : ["10 analyses / month", "All 7 agents", "PDF & Markdown export", "Community support"]
            ).map((f) => (
              <span key={f} className="inline-flex items-center gap-1 rounded-full bg-muted/40 border border-border px-2 py-1">
                <Check className="h-3 w-3 text-success" /> {f}
              </span>
            ))}
          </div>
        </div>

        <div className="rounded-xl border border-border bg-card p-6">
          <div className="text-xs uppercase tracking-wider text-muted-foreground">Payment method</div>
          {isPaid ? (
            <>
              <div className="mt-3 rounded-md border border-border p-3 flex items-center gap-3">
                <div className="h-7 w-10 rounded bg-gradient-to-br from-slate-700 to-slate-900 grid place-items-center text-[10px] font-bold text-white">VISA</div>
                <div className="text-sm">•••• 4242</div>
              </div>
              <Button variant="outline" size="sm" className="mt-3 w-full">Update card</Button>
            </>
          ) : (
            <p className="mt-3 text-sm text-muted-foreground">No payment method on the free plan.</p>
          )}
        </div>
      </div>

      {isPaid && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className="px-5 py-4 border-b border-border">
            <h3 className="font-display font-semibold">Invoices</h3>
            <p className="text-xs text-muted-foreground">Download past receipts.</p>
          </div>
          <div className="divide-y divide-border">
            {[{ d: "Jun 27, 2026", a: "$588.00", n: "INV-1042" }].map((i) => (
              <div key={i.n} className="flex items-center px-5 py-3.5">
                <div className="text-sm font-medium flex-1">{i.n}</div>
                <div className="text-sm text-muted-foreground w-40">{i.d}</div>
                <div className="text-sm w-24 text-right">{i.a}</div>
                <Button variant="ghost" size="icon" className="ml-3 h-8 w-8"><Download className="h-4 w-4" /></Button>
              </div>
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function Stat({ label, value }: { label: string; value: string }) {
  return (
    <div className="rounded-md bg-muted/40 p-3">
      <div className="text-[11px] uppercase tracking-wider text-muted-foreground">{label}</div>
      <div className="mt-1 font-display text-lg font-semibold">{value}</div>
    </div>
  );
}
