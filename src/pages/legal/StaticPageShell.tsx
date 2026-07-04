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
    <div className="min-h-screen bg-background text-foreground flex flex-col" style={{ fontFamily: "'Manrope', sans-serif" }}>
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-background"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="container flex h-14 items-center justify-between px-4">
          <Logo />
          <Link
            to="/"
            className="inline-flex items-center gap-1.5 text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
          >
            <ArrowLeft className="h-3.5 w-3.5" /> Back to home
          </Link>
        </div>
      </header>

      <main className="flex-1">
        <div className="container px-4 py-16 md:py-24">
          <div className="mx-auto max-w-3xl">
            {/* Page title block */}
            <div style={{ borderBottom: "1px solid hsl(var(--border))", paddingBottom: "2rem", marginBottom: "2.5rem" }}>
              <div className="section-label mb-3">ArchMind AI</div>
              <h1
                className="font-display font-semibold tracking-tight"
                style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, color: "hsl(var(--foreground))" }}
              >
                {title}
              </h1>
              <p className="mt-3 text-sm text-muted-foreground">Last updated: {lastUpdated}</p>
            </div>

            <div className="space-y-12">{children}</div>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}>
        <div className="container px-4 py-6 flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
          <span className="text-xs text-muted-foreground">© 2026 ArchMind AI, Inc.</span>
          <nav className="flex items-center gap-5 text-xs">
            {[
              { label: "Privacy", to: "/privacy" },
              { label: "Terms", to: "/terms" },
              { label: "Security", to: "/security" },
              { label: "Contact", to: "/contact" },
            ].map((l) => (
              <Link
                key={l.label}
                to={l.to}
                className="text-muted-foreground hover:text-foreground transition-colors font-medium"
              >
                {l.label}
              </Link>
            ))}
          </nav>
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
      <h2
        className="font-display font-semibold tracking-tight mb-4"
        style={{ fontSize: "1.25rem", color: "hsl(var(--foreground))" }}
      >
        {title}
      </h2>
      <div
        className="space-y-3 leading-relaxed"
        style={{ fontSize: "0.9375rem", color: "hsl(var(--muted-foreground))", lineHeight: 1.75 }}
      >
        {children}
      </div>
    </section>
  );
}
