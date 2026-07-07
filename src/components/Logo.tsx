import { Link } from "react-router-dom";
import { cn } from "@/lib/utils";

export function Logo({ className, withText = true }: { className?: string; withText?: boolean }) {
  return (
    <Link to="/" className={cn("flex items-center gap-2 group", className)}>
      <div className="relative h-8 w-8 rounded-lg bg-gradient-primary shadow-glow grid place-items-center overflow-hidden">
        <svg viewBox="0 0 24 24" className="h-5 w-5 text-primary-foreground" fill="none" stroke="currentColor" strokeWidth="2.4" strokeLinecap="round" strokeLinejoin="round">
          <path d="M4 18 L12 4 L20 18" />
          <path d="M8 14 H16" />
          <circle cx="12" cy="20" r="1.5" fill="currentColor" stroke="none" />
        </svg>
        <div className="absolute inset-0 bg-white/20 opacity-0 group-hover:opacity-100 transition-opacity" />
      </div>
      {withText && (
        <span className="font-display font-semibold tracking-tight text-[15px] text-foreground">
          ArchMind<span className="text-primary"> AI</span>
        </span>
      )}
    </Link>
  );
}
