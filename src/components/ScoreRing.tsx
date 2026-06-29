import { cn } from "@/lib/utils";
import { scoreColor } from "@/lib/mock-data";

export function ScoreRing({ value, size = 64, label }: { value: number; size?: number; label?: string }) {
  const r = (size - 8) / 2;
  const c = 2 * Math.PI * r;
  const offset = c - (Math.max(0, Math.min(100, value)) / 100) * c;
  const color = value >= 80 ? "hsl(var(--success))" : value >= 65 ? "hsl(var(--warning))" : "hsl(var(--danger))";
  return (
    <div className="relative grid place-items-center" style={{ width: size, height: size }}>
      <svg width={size} height={size} className="-rotate-90">
        <circle cx={size / 2} cy={size / 2} r={r} stroke="hsl(var(--muted))" strokeWidth="6" fill="none" />
        <circle
          cx={size / 2} cy={size / 2} r={r} stroke={color} strokeWidth="6" fill="none"
          strokeLinecap="round" strokeDasharray={c} strokeDashoffset={offset}
          style={{ transition: "stroke-dashoffset 0.8s ease" }}
        />
      </svg>
      <div className="absolute inset-0 grid place-items-center">
        <div className="text-center">
          <div className={cn("font-display font-semibold leading-none", scoreColor(value))} style={{ fontSize: size * 0.28 }}>
            {value}
          </div>
          {label && <div className="text-[9px] uppercase tracking-wider text-muted-foreground mt-0.5">{label}</div>}
        </div>
      </div>
    </div>
  );
}
