import { Link } from "react-router-dom";
import { ArrowLeft } from "lucide-react";
import { Logo } from "@/components/Logo";

export function StaticPageShell({
  title,
  lastUpdated = "July 2026",
  children,
}: {
  title: string;
  lastUpdated?: string;
  children: React.ReactNode;
}) {
  return (
    <div className="min-h-screen bg-background text-foreground flex flex-col">
      <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/70">
        <div className="container flex h-14 items-center justify-between px-4">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-4 w-4" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container px-4 py-16 md:py-20">
          <div className="mx-auto max-w-3xl">
            <h1 className="font-display text-4xl md:text-5xl font-semibold tracking-tight">
              {title}
            </h1>
            <p className="mt-3 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            <div className="mt-10 space-y-10">{children}</div>
          </div>
        </div>
      </main>

      <footer className="border-t border-border/60">
        <div className="container px-4 py-5 text-xs text-muted-foreground">
          © 2026 ArchMind AI, Inc.
        </div>
      </footer>
    </div>
  );
}

export function PageSection({
  title,
  children,
}: {
  title: string;
  children: React.ReactNode;
}) {
  return (
    <section>
      <h2 className="font-display text-xl md:text-2xl font-semibold tracking-tight">{title}</h2>
      <div className="mt-3 space-y-3 text-sm md:text-[15px] leading-relaxed text-muted-foreground">
        {children}
      </div>
    </section>
  );
}
