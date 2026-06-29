import { useState } from "react";
import { PageHeader } from "@/components/PageHeader";
import { MOCK_ANALYSES, AGENTS, AgentKey, scoreColor } from "@/lib/mock-data";
import { Select, SelectContent, SelectItem, SelectTrigger, SelectValue } from "@/components/ui/select";
import { ScoreRing } from "@/components/ScoreRing";
import { ArrowRight, Minus, TrendingDown, TrendingUp } from "lucide-react";

export default function Compare() {
  const ready = MOCK_ANALYSES.filter((a) => a.status === "ready");
  const [a, setA] = useState(ready[0].id);
  const [b, setB] = useState(ready[1].id);
  const A = ready.find((x) => x.id === a)!;
  const B = ready.find((x) => x.id === b)!;

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto">
      <PageHeader
        title="Compare analyses"
        description="See what changed between two versions of an architecture."
      />

      <div className="grid grid-cols-1 md:grid-cols-[1fr_auto_1fr] items-center gap-3 mb-6">
        <Picker value={a} onChange={setA} options={ready} label="Base" />
        <ArrowRight className="hidden md:block h-5 w-5 text-muted-foreground justify-self-center" />
        <Picker value={b} onChange={setB} options={ready} label="Compare" />
      </div>

      <div className="rounded-xl border border-border bg-card overflow-hidden">
        <div className="grid grid-cols-3 px-5 py-4 border-b border-border text-xs uppercase tracking-wider text-muted-foreground">
          <div>Dimension</div>
          <div className="text-center">{A.name}</div>
          <div className="text-center">{B.name}</div>
        </div>
        {AGENTS.map((ag) => {
          const sA = A.scores[ag.key as AgentKey];
          const sB = B.scores[ag.key as AgentKey];
          const delta = sB - sA;
          const TrendIcon = delta > 0 ? TrendingUp : delta < 0 ? TrendingDown : Minus;
          const trendColor = delta > 0 ? "text-success" : delta < 0 ? "text-danger" : "text-muted-foreground";
          return (
            <div key={ag.key} className="grid grid-cols-3 items-center px-5 py-4 border-b border-border last:border-b-0">
              <div className="text-sm font-medium">{ag.name.replace(" Agent","")}</div>
              <div className="flex items-center justify-center gap-3">
                <ScoreRing value={sA} size={44} />
              </div>
              <div className="flex items-center justify-center gap-3">
                <ScoreRing value={sB} size={44} />
                <div className={`flex items-center gap-1 text-xs font-medium ${trendColor}`}>
                  <TrendIcon className="h-3.5 w-3.5" />
                  {delta > 0 ? `+${delta}` : delta}
                </div>
              </div>
            </div>
          );
        })}
      </div>
    </div>
  );
}

function Picker({ value, onChange, options, label }: {
  value: string; onChange: (v: string) => void; options: typeof MOCK_ANALYSES; label: string;
}) {
  return (
    <div className="rounded-xl border border-border bg-card p-4">
      <div className="text-xs uppercase tracking-wider text-muted-foreground mb-2">{label}</div>
      <Select value={value} onValueChange={onChange}>
        <SelectTrigger><SelectValue /></SelectTrigger>
        <SelectContent>
          {options.map((o) => <SelectItem key={o.id} value={o.id}>{o.name}</SelectItem>)}
        </SelectContent>
      </Select>
    </div>
  );
}
