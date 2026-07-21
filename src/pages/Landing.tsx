import { useState, useEffect, useRef } from "react";
import { Link } from "react-router-dom";
import { motion, useInView } from "framer-motion";
import {
  ArrowRight, ShieldCheck, Gauge, TrendingUp,
  HeartPulse, DollarSign, Wrench, Activity,
  FileImage, FileCode2, Workflow, Check, Github,
  Slack, Brain, Server, Star, Menu, Plus, Minus,
  Zap, Users, BarChart3, MessageSquare,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { SeoMeta } from "@/components/SeoMeta";
import { Logo } from "@/components/Logo";
import { ThemeToggle } from "@/components/ThemeToggle";
import { AGENTS } from "@/lib/mock-data";

const ICONS: Record<string, React.ComponentType<{ className?: string; style?: React.CSSProperties }>> = {
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity,
};

const AGENT_SCORES = [82, 74, 91, 67, 88, 79, 85];

const TESTIMONIALS = [
  {
    name: "Staff Engineer",
    role: "Series-B developer-tools startup",
    avatar: "SE",
    quote: "ArchMind caught a caching misconfiguration that would've cost us thousands a month. The scalability agent spotted it in 30 seconds.",
  },
  {
    name: "Principal Architect",
    role: "Cloud infrastructure team",
    avatar: "PA",
    quote: "We run ArchMind on every RFC now. It's like having 7 senior engineers review your diagram before anyone sees a PR.",
  },
  {
    name: "Platform CTO",
    role: "Regulated fintech",
    avatar: "CT",
    quote: "It runs on local models via Ollama, so we use it without sending any data to third parties. Compliance sign-off was trivial.",
  },
];

const FAQS = [
  { q: "How do the agents work?", a: "Each agent is a specialized LLM prompt tuned to a specific architectural concern — scalability, security, reliability, performance, cost, maintainability, and observability. They analyze your diagram in parallel, debate findings, and synthesize into actionable recommendations." },
  { q: "Do I need to pay for LLM API costs?", a: "No. ArchMind supports free and open-source LLM providers. Run locally with Ollama, use Groq's free tier, or bring your own OpenAI-compatible endpoint. No credit card required." },
  { q: "What diagram formats are supported?", a: "Mermaid, PlantUML, Draw.io, Excalidraw, Lucidchart, Figma exports, PNG/JPG screenshots, and PDFs. We parse the structure and rebuild an interactive graph you can explore." },
  { q: "Can I self-host ArchMind?", a: "Yes. The entire stack is open-source friendly. Run the FastAPI backend + React frontend anywhere. Set OLLAMA_BASE_URL for fully offline operation." },
  { q: "How accurate are the agent findings?", a: "Accuracy depends on the LLM provider. Local models provide solid general analysis. Cloud models offer deeper reasoning. All findings include specific, actionable recommendations — not generic advice." },
  { q: "What about team collaboration?", a: "Workspaces, role-based access, compare mode, and shared report links are included. Export findings as PDF, Markdown, or JSON for your RFCs." },
];

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

// ── Animated counter hook ───────────────────────────────────────────────
function useCountUp(target: number, duration = 1200, start = false) {
  const [val, setVal] = useState(0);
  useEffect(() => {
    if (!start) return;
    let startTime: number | null = null;
    const tick = (ts: number) => {
      if (!startTime) startTime = ts;
      const prog = Math.min((ts - startTime) / duration, 1);
      const ease = 1 - Math.pow(1 - prog, 3);
      setVal(Math.round(ease * target));
      if (prog < 1) requestAnimationFrame(tick);
    };
    requestAnimationFrame(tick);
  }, [target, duration, start]);
  return val;
}

// ── Blueprint grid background ───────────────────────────────────────────
function BlueprintGrid({ className = "" }: { className?: string }) {
  return (
    <div
      className={`absolute inset-0 pointer-events-none ${className}`}
      style={{
        backgroundImage: `
          linear-gradient(hsl(220 30% 30% / 0.15) 1px, transparent 1px),
          linear-gradient(90deg, hsl(220 30% 30% / 0.15) 1px, transparent 1px),
          radial-gradient(hsl(220 30% 40% / 0.3) 1px, transparent 1px)
        `,
        backgroundSize: "80px 80px, 80px 80px, 20px 20px",
      }}
    />
  );
}

// ── Main page ───────────────────────────────────────────────────────────
export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground overflow-x-hidden" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <SeoMeta />
      <SiteHeader />
      <Hero />
      <LogoCloud />
      <AgentsSection />
      <HowItWorks />
      <FeaturesSection />
      <Testimonials />
      <FAQ />
      <FinalCTA />
      <SiteFooter />
    </div>
  );
}

// ── Header ──────────────────────────────────────────────────────────────
function SiteHeader() {
  const [scrolled, setScrolled] = useState(false);
  useEffect(() => {
    const fn = () => setScrolled(window.scrollY > 24);
    window.addEventListener("scroll", fn, { passive: true });
    return () => window.removeEventListener("scroll", fn);
  }, []);

  return (
    <header
      className="sticky top-0 z-40 transition-all duration-300"
      style={{
        background: scrolled ? "hsl(var(--background) / 0.95)" : "hsl(var(--background))",
        backdropFilter: scrolled ? "blur(12px)" : "none",
        borderBottom: "1px solid hsl(var(--border))",
        boxShadow: scrolled ? "0 1px 16px hsl(222 62% 11% / 0.06)" : "none",
      }}
    >
      <div className="max-w-7xl mx-auto flex h-14 items-center px-4 md:px-8">
        <Logo />

        <nav className="hidden md:flex items-center gap-8 ml-10 text-sm">
          {[
            { label: "Agents", href: "#agents" },
            { label: "How it works", href: "#workflow" },
            { label: "Features", href: "#features" },
            { label: "Pricing", to: "/pricing" },
          ].map((item) =>
            item.to ? (
              <Link key={item.label} to={item.to}
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >{item.label}</Link>
            ) : (
              <a key={item.label} href={item.href}
                className="font-medium text-muted-foreground hover:text-foreground transition-colors"
              >{item.label}</a>
            )
          )}
        </nav>

        <div className="ml-auto flex items-center gap-3">
          <ThemeToggle />
          <Link to="/login" className="hidden sm:block text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">Sign in</Link>
          <Link to="/signup">
            <button
              className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold transition-all"
              style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}
              onMouseEnter={(e) => { e.currentTarget.style.opacity = "0.85"; e.currentTarget.style.transform = "translateY(-1px)"; }}
              onMouseLeave={(e) => { e.currentTarget.style.opacity = ""; e.currentTarget.style.transform = ""; }}
            >
              Get started <ArrowRight className="h-3.5 w-3.5" />
            </button>
          </Link>
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="right" className="w-72 bg-background border-border">
              <nav className="mt-8 flex flex-col gap-1 text-sm">
                {["#agents:Agents", "#workflow:How it works", "#features:Features"].map((s) => {
                  const [href, label] = s.split(":");
                  return <a key={href} href={href} className="rounded-md px-3 py-2.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted">{label}</a>;
                })}
                <Link to="/pricing" className="rounded-md px-3 py-2.5 font-medium text-muted-foreground hover:text-foreground hover:bg-muted">Pricing</Link>
              </nav>
              <div className="mt-6 flex flex-col gap-2 border-t border-border pt-6">
                <Link to="/login"><Button variant="outline" className="w-full">Sign in</Button></Link>
                <Link to="/signup">
                  <button className="w-full rounded-md py-2 text-sm font-semibold" style={{ background: "hsl(var(--foreground))", color: "hsl(var(--background))" }}>Get started</button>
                </Link>
              </div>
            </SheetContent>
          </Sheet>
        </div>
      </div>
    </header>
  );
}

// ── Hero ────────────────────────────────────────────────────────────────
function Hero() {
  const [started, setStarted] = useState(false);
  const [agentsDone, setAgentsDone] = useState(0);
  const overallScore = useCountUp(81, 1400, started);

  useEffect(() => {
    const t = setTimeout(() => setStarted(true), 600);
    return () => clearTimeout(t);
  }, []);

  useEffect(() => {
    if (!started) return;
    const intervals = AGENTS.map((_, i) =>
      setTimeout(() => setAgentsDone((d) => Math.max(d, i + 1)), 300 + i * 220)
    );
    return () => intervals.forEach(clearTimeout);
  }, [started]);

  return (
    <section
      className="relative overflow-hidden"
      style={{ background: "hsl(222 62% 11%)", color: "hsl(220 18% 94%)", minHeight: "92vh" }}
    >
      <BlueprintGrid />

      {/* Radial coral glow — subtle */}
      <div
        className="absolute pointer-events-none"
        style={{
          top: "30%",
          right: "15%",
          width: 480,
          height: 480,
          borderRadius: "50%",
          background: "radial-gradient(circle, hsl(16 76% 52% / 0.08) 0%, transparent 70%)",
        }}
      />

      <div className="relative max-w-7xl mx-auto px-4 md:px-8 pt-24 pb-32 md:pt-32 md:pb-40">
        <div className="grid lg:grid-cols-[1fr_420px] xl:grid-cols-[1fr_500px] gap-12 xl:gap-20 items-start">

          {/* Left */}
          <motion.div
            initial={{ opacity: 0, y: 28 }}
            animate={{ opacity: 1, y: 0 }}
            transition={{ duration: 0.6, ease: [0.16, 1, 0.3, 1] }}
          >
            {/* Badge */}
            <div
              className="inline-flex items-center gap-2 rounded-full px-3 py-1 text-xs font-semibold mb-8 select-none"
              style={{ background: "hsl(16 76% 52% / 0.12)", color: "hsl(16 76% 72%)", border: "1px solid hsl(16 76% 52% / 0.25)" }}
            >
              <span className="h-1.5 w-1.5 rounded-full" style={{ background: "hsl(16 76% 56%)", display: "inline-block", animation: "pulse 2s ease-in-out infinite" }} />
              Seven specialized AI agents · Live
            </div>

            {/* Headline — very large, character-tight */}
            <h1
              className="font-display leading-[1.04] tracking-tight"
              style={{ fontSize: "clamp(3rem, 6.5vw, 5.2rem)", fontWeight: 600, letterSpacing: "-0.02em" }}
            >
              The AI staff architect
              <br />
              <span style={{ color: "hsl(16 76% 60%)", fontStyle: "italic" }}>your team never had.</span>
            </h1>

            <p className="mt-7 text-lg leading-relaxed" style={{ color: "hsl(220 14% 62%)", maxWidth: "36ch" }}>
              Upload any architecture diagram. Get expert analysis across scalability, security,
              reliability, cost, and more — in under 3 minutes.
            </p>

            {/* CTAs */}
            <div className="mt-10 flex flex-wrap items-center gap-4">
              <Link to="/signup">
                <button
                  className="inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold text-white transition-all"
                  style={{ background: "hsl(16 76% 52%)", boxShadow: "0 2px 12px hsl(16 76% 52% / 0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 24px hsl(16 76% 52% / 0.5)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 12px hsl(16 76% 52% / 0.35)"; }}
                >
                  Start building free <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
              <Link to="/generate">
                <button
                  className="inline-flex items-center gap-2 rounded-md px-7 py-3.5 text-sm font-semibold transition-all"
                  style={{ background: "transparent", border: "1px solid hsl(220 30% 32%)", color: "hsl(220 18% 78%)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.borderColor = "hsl(220 30% 52%)"; e.currentTarget.style.color = "hsl(220 18% 96%)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.borderColor = "hsl(220 30% 32%)"; e.currentTarget.style.color = "hsl(220 18% 78%)"; }}
                >
                  Generate architecture
                </button>
              </Link>
            </div>

            {/* Trust signals */}
            <div className="mt-9 flex flex-wrap items-center gap-6 text-xs" style={{ color: "hsl(220 14% 48%)" }}>
              {["No credit card", "SOC 2 ready", "Self-host available"].map((t) => (
                <span key={t} className="flex items-center gap-1.5">
                  <Check className="h-3.5 w-3.5" style={{ color: "hsl(155 60% 44%)" }} />
                  {t}
                </span>
              ))}
            </div>
          </motion.div>

          {/* Right — live analysis panel */}
          <motion.div
            initial={{ opacity: 0, y: 36, scale: 0.98 }}
            animate={{ opacity: 1, y: 0, scale: 1 }}
            transition={{ duration: 0.7, delay: 0.2, ease: [0.16, 1, 0.3, 1] }}
            className="lg:sticky lg:top-24"
          >
            <div
              className="rounded-xl overflow-hidden"
              style={{
                background: "hsl(222 52% 9%)",
                border: "1px solid hsl(222 36% 20%)",
                boxShadow: "0 32px 80px hsl(0 0% 0% / 0.5), 0 8px 32px hsl(0 0% 0% / 0.35)",
              }}
            >
              {/* Window chrome */}
              <div
                className="flex items-center gap-2 px-4 py-3 select-none"
                style={{ background: "hsl(222 56% 7%)", borderBottom: "1px solid hsl(222 36% 18%)" }}
              >
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(0 72% 52%)" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(36 90% 52%)" }} />
                <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(155 60% 38%)" }} />
                <div className="ml-3 text-[11px] font-mono" style={{ color: "hsl(220 14% 38%)" }}>
                  archmind.ai/analyses/checkout-v3
                </div>
              </div>

              {/* Score header */}
              <div
                className="flex items-center justify-between px-5 py-4"
                style={{ borderBottom: "1px solid hsl(222 36% 16%)" }}
              >
                <div>
                  <div className="text-[10px] font-mono uppercase tracking-widest mb-0.5" style={{ color: "hsl(220 14% 40%)" }}>
                    Overall Score
                  </div>
                  <div
                    className="font-display font-semibold tabular-nums"
                    style={{ fontSize: "2.8rem", lineHeight: 1, color: overallScore >= 80 ? "hsl(155 60% 50%)" : "hsl(36 90% 52%)" }}
                  >
                    {String(overallScore).padStart(2, "0")}
                    <span style={{ fontSize: "1rem", color: "hsl(220 14% 40%)", fontWeight: 400 }}>/100</span>
                  </div>
                </div>
                <div
                  className="rounded-lg px-3 py-2 text-center"
                  style={{ background: "hsl(16 76% 52% / 0.1)", border: "1px solid hsl(16 76% 52% / 0.2)" }}
                >
                  <div className="text-[10px] font-mono uppercase tracking-wider mb-0.5" style={{ color: "hsl(16 76% 60%)" }}>Agents</div>
                  <div className="font-display font-semibold text-xl" style={{ color: "hsl(16 76% 66%)" }}>
                    {agentsDone}<span style={{ fontSize: "0.7em", color: "hsl(220 14% 40%)" }}>/7</span>
                  </div>
                </div>
              </div>

              {/* Agent list */}
              <div className="p-4 space-y-2">
                {AGENTS.map((a, i) => {
                  const Icon = ICONS[a.icon];
                  const done = i < agentsDone;
                  const score = AGENT_SCORES[i];
                  return (
                    <motion.div
                      key={a.key}
                      initial={{ opacity: 0, x: 8 }}
                      animate={{ opacity: done || i === agentsDone ? 1 : 0.35, x: 0 }}
                      transition={{ duration: 0.3, delay: i * 0.05 }}
                      className="flex items-center gap-3 rounded-lg px-3 py-2.5"
                      style={{
                        background: i === agentsDone && !done ? "hsl(16 76% 52% / 0.08)" : "hsl(222 45% 13%)",
                        border: `1px solid ${i === agentsDone && !done ? "hsl(16 76% 52% / 0.2)" : "hsl(222 36% 18%)"}`,
                        transition: "all 0.25s ease",
                      }}
                    >
                      <div
                        className="h-6 w-6 rounded flex-shrink-0 grid place-items-center"
                        style={{ background: "hsl(16 76% 52% / 0.15)" }}
                      >
                        {Icon && <Icon className="h-3 w-3" style={{ color: "hsl(16 76% 62%)" }} />}
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-[11px] font-semibold truncate" style={{ color: "hsl(220 18% 82%)" }}>
                          {a.name.replace(" Agent", "")}
                        </div>
                      </div>
                      <div className="flex-shrink-0 w-14 text-right">
                        {done ? (
                          <span
                            className="font-mono font-semibold text-sm tabular-nums"
                            style={{ color: score >= 80 ? "hsl(155 60% 50%)" : score >= 65 ? "hsl(36 90% 52%)" : "hsl(0 72% 56%)" }}
                          >
                            {score}
                          </span>
                        ) : i === agentsDone ? (
                          <span className="text-[10px] font-mono" style={{ color: "hsl(16 76% 56%)", animation: "pulse 1.5s ease-in-out infinite" }}>
                            running…
                          </span>
                        ) : (
                          <span className="text-[10px] font-mono" style={{ color: "hsl(220 14% 32%)" }}>queued</span>
                        )}
                      </div>
                    </motion.div>
                  );
                })}
              </div>

              {/* Mini diagram */}
              <div className="px-4 pb-4">
                <div
                  className="rounded-lg overflow-hidden"
                  style={{ background: "hsl(222 56% 7%)", border: "1px solid hsl(222 36% 16%)" }}
                >
                  <div className="px-3 py-2 text-[10px] font-mono uppercase tracking-wider" style={{ color: "hsl(220 14% 36%)", borderBottom: "1px solid hsl(222 36% 14%)" }}>
                    Architecture Diagram
                  </div>
                  <HeroDiagram />
                </div>
              </div>
            </div>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

function HeroDiagram() {
  const nodes = [
    { x: 8, y: 10, w: 72, label: "Client" },
    { x: 110, y: 10, w: 72, label: "CDN" },
    { x: 212, y: 10, w: 88, label: "API GW" },
    { x: 110, y: 90, w: 72, label: "Auth" },
    { x: 212, y: 90, w: 88, label: "Orders" },
    { x: 320, y: 90, w: 72, label: "Workers" },
    { x: 212, y: 170, w: 88, label: "Postgres" },
    { x: 320, y: 170, w: 72, label: "Redis" },
  ];
  const edges: [number, number][] = [[0,1],[1,2],[2,3],[2,4],[4,5],[4,6],[5,7],[4,7]];
  return (
    <svg viewBox="0 0 420 210" className="w-full h-auto" style={{ display: "block" }}>
      {edges.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const ax = A.x + A.w / 2, ay = A.y + 18;
        const bx = B.x + B.w / 2, by = B.y + 18;
        return (
          <path key={i} d={`M ${ax} ${ay} C ${ax} ${(ay+by)/2}, ${bx} ${(ay+by)/2}, ${bx} ${by}`}
            stroke="hsl(220 30% 30%)" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
        );
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={n.w} height={36} rx={4}
            fill="hsl(222 45% 14%)"
            stroke={i === 4 ? "hsl(0 72% 52%)" : "hsl(222 36% 24%)"}
            strokeWidth={i === 4 ? 1.5 : 1}
          />
          <text x={n.x + n.w/2} y={n.y + 22} textAnchor="middle"
            fill="hsl(220 18% 70%)" fontSize="9.5" fontFamily="Manrope, sans-serif" fontWeight="600">
            {n.label}
          </text>
        </g>
      ))}
      <circle cx={300} cy={90} r={4} fill="hsl(0 72% 52%)">
        <animate attributeName="r" values="4;7;4" dur="2.2s" repeatCount="indefinite"/>
        <animate attributeName="opacity" values="1;0.5;1" dur="2.2s" repeatCount="indefinite"/>
      </circle>
    </svg>
  );
}

// ── Logo cloud ──────────────────────────────────────────────────────────
function LogoCloud() {
  return (
    <section style={{ background: "hsl(var(--muted))", borderTop: "1px solid hsl(var(--border))", borderBottom: "1px solid hsl(var(--border))" }}>
      <div className="max-w-7xl mx-auto py-10 px-4 md:px-8 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        <span className="text-[11px] font-bold uppercase tracking-[0.12em]" style={{ color: "hsl(220 14% 62%)" }}>
          Trusted at engineering teams inside
        </span>
        {["Linear", "Vercel", "Stripe", "Notion", "Datadog", "Snowflake", "Figma"].map((n) => (
          <span key={n} className="text-sm font-extrabold select-none" style={{ color: "hsl(220 14% 76%)", letterSpacing: "0.03em" }}>{n}</span>
        ))}
      </div>
    </section>
  );
}

// ── Agents Section ──────────────────────────────────────────────────────
function AgentsSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-100px" });

  return (
    <section id="agents" ref={ref} style={{ background: "hsl(222 62% 11%)", color: "hsl(220 18% 94%)" }}>
      <div className="relative overflow-hidden">
        <BlueprintGrid />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-28">

          {/* Section header */}
          <motion.div
            initial={{ opacity: 0, y: 20 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.55 }}
            className="mb-16"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(16 76% 60%)" }}>
              The intelligence layer
            </div>
            <div className="flex flex-col md:flex-row md:items-end md:justify-between gap-6">
              <h2
                className="font-display font-semibold tracking-tight"
                style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 1.06, letterSpacing: "-0.02em" }}
              >
                Seven agents.{" "}
                <span style={{ fontStyle: "italic", color: "hsl(16 76% 58%)" }}>One verdict.</span>
              </h2>
              <p className="text-base max-w-sm leading-relaxed" style={{ color: "hsl(220 14% 56%)" }}>
                Each agent is a domain expert. They run in parallel, debate findings, and
                synthesize a single actionable report.
              </p>
            </div>
          </motion.div>

          {/* Agent grid */}
          <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-4 gap-3">
            {AGENTS.map((a, idx) => {
              const Icon = ICONS[a.icon];
              const score = AGENT_SCORES[idx];
              return (
                <motion.div
                  key={a.key}
                  initial={{ opacity: 0, y: 20 }}
                  animate={inView ? { opacity: 1, y: 0 } : {}}
                  transition={{ duration: 0.4, delay: idx * 0.07 }}
                  className="relative rounded-xl p-5 group"
                  style={{
                    background: "hsl(222 50% 13%)",
                    border: "1px solid hsl(222 36% 20%)",
                    transition: "border-color 0.2s ease, transform 0.2s ease",
                  }}
                  onMouseEnter={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(16 76% 52% / 0.5)";
                    (e.currentTarget as HTMLDivElement).style.transform = "translateY(-3px)";
                  }}
                  onMouseLeave={(e) => {
                    (e.currentTarget as HTMLDivElement).style.borderColor = "hsl(222 36% 20%)";
                    (e.currentTarget as HTMLDivElement).style.transform = "";
                  }}
                >
                  {/* Big background number */}
                  <div
                    className="absolute top-3 right-4 font-display font-semibold select-none pointer-events-none"
                    style={{ fontSize: "3.5rem", lineHeight: 1, color: "hsl(222 45% 18%)", transition: "color 0.2s ease" }}
                  >
                    {String(idx + 1).padStart(2, "0")}
                  </div>

                  <div
                    className="h-9 w-9 rounded-md grid place-items-center mb-4"
                    style={{ background: "hsl(16 76% 52% / 0.12)", border: "1px solid hsl(16 76% 52% / 0.2)" }}
                  >
                    {Icon && <Icon className="h-4.5 w-4.5" style={{ color: "hsl(16 76% 60%)" }} />}
                  </div>

                  <div className="font-semibold text-sm mb-1.5" style={{ color: "hsl(220 18% 88%)" }}>
                    {a.name.replace(" Agent", "")}
                  </div>
                  <p className="text-xs leading-relaxed" style={{ color: "hsl(220 14% 50%)" }}>
                    {a.description}
                  </p>

                  {/* Score chip */}
                  <div className="mt-4 flex items-center gap-1.5">
                    <div
                      className="h-1.5 flex-1 rounded-full overflow-hidden"
                      style={{ background: "hsl(222 45% 20%)" }}
                    >
                      <div
                        className="h-full rounded-full transition-all"
                        style={{
                          width: `${score}%`,
                          background: score >= 80 ? "hsl(155 60% 44%)" : score >= 65 ? "hsl(36 90% 52%)" : "hsl(0 72% 52%)",
                        }}
                      />
                    </div>
                    <span
                      className="text-[10px] font-mono font-semibold tabular-nums"
                      style={{ color: score >= 80 ? "hsl(155 60% 50%)" : score >= 65 ? "hsl(36 90% 52%)" : "hsl(0 72% 56%)" }}
                    >
                      {score}
                    </span>
                  </div>
                </motion.div>
              );
            })}

            {/* 8th cell — CTA */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.56 }}
              className="rounded-xl p-5 flex flex-col justify-between"
              style={{ background: "hsl(16 76% 52%)", border: "1px solid hsl(16 76% 44%)" }}
            >
              <div>
                <div className="font-display text-3xl font-semibold text-white mb-2" style={{ lineHeight: 1.1 }}>
                  Ready to review?
                </div>
                <p className="text-sm leading-relaxed" style={{ color: "hsl(16 76% 88%)" }}>
                  Upload your first diagram. No credit card needed.
                </p>
              </div>
              <Link to="/signup" className="mt-6 inline-block">
                <button
                  className="inline-flex items-center gap-1.5 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-all"
                  style={{ background: "hsl(222 62% 11%)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
                >
                  Start free <ArrowRight className="h-3.5 w-3.5" />
                </button>
              </Link>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── How It Works ────────────────────────────────────────────────────────
function HowItWorks() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  const steps = [
    { n: "01", title: "Upload", desc: "Drop a diagram, paste a Mermaid snippet, or generate one from a text prompt.", icon: FileCode2 },
    { n: "02", title: "Analyze", desc: "Seven AI agents review your architecture in parallel against industry benchmarks.", icon: Activity },
    { n: "03", title: "Act", desc: "Download a report, chat with findings, or compare against a previous version.", icon: BarChart3 },
  ];

  return (
    <section id="workflow" ref={ref} style={{ background: "hsl(var(--muted))", borderTop: "1px solid hsl(var(--border))" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-16 max-w-lg"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(16 76% 52%)" }}>
            How it works
          </div>
          <h2
            className="font-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.02em" }}
          >
            From diagram to insight.<br />Three steps.
          </h2>
        </motion.div>

        <div className="relative grid md:grid-cols-3 gap-6">
          {/* Connector line */}
          <div
            className="hidden md:block absolute top-14 left-[calc(33.3%+24px)] w-[calc(66.6%-48px)] h-px pointer-events-none"
            style={{ background: "linear-gradient(90deg, hsl(16 76% 52%), hsl(16 76% 52% / 0.3))" }}
          />

          {steps.map((s, i) => (
            <motion.div
              key={s.n}
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.45, delay: i * 0.12 }}
              className="relative rounded-xl p-7"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 2px 12px hsl(222 62% 11% / 0.06)",
              }}
            >
              <div
                className="font-display font-semibold mb-6 select-none"
                style={{ fontSize: "4rem", lineHeight: 1, color: "hsl(220 16% 92%)", letterSpacing: "-0.03em" }}
              >
                {s.n}
              </div>
              <div
                className="h-10 w-10 rounded-lg grid place-items-center mb-4"
                style={{ background: "hsl(222 62% 11%)" }}
              >
                <s.icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-display text-xl font-semibold mb-2">{s.title}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{s.desc}</p>
            </motion.div>
          ))}
        </div>

        {/* Formats bar */}
        <div className="mt-16">
          <div className="text-xs font-semibold text-muted-foreground mb-5 uppercase tracking-widest">Supported formats</div>
          <div className="flex flex-wrap gap-2">
            {["PNG / JPG", "PDF", "Mermaid", "PlantUML", "Draw.io", "Excalidraw", "Lucidchart", "Figma export", "Terraform", "Kubernetes YAML", "OpenAPI", "SQL Schema"].map((f) => (
              <span
                key={f}
                className="text-xs font-semibold rounded-md px-3 py-1.5"
                style={{ background: "hsl(var(--card))", border: "1px solid hsl(var(--border))", color: "hsl(222 62% 22%)" }}
              >
                {f}
              </span>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Features — Bento Grid ───────────────────────────────────────────────
function FeaturesSection() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });

  const features = [
    {
      wide: true,
      icon: Workflow,
      label: "Interactive diagram viewer",
      desc: "Pan, zoom, and click any node to surface findings. Severity heat-map highlights where attention is needed most. Filter by agent, severity, or node.",
      accent: true,
    },
    { icon: TrendingUp, label: "Score history & trends", desc: "Track architecture quality over time. Compare across PRs and deployments." },
    { icon: Users, label: "Team workspaces", desc: "Role-based access for engineers, leads, and execs. Shared analysis links." },
    { icon: Brain, label: "Chat with findings", desc: "Ask follow-ups. Agents have full diagram context to answer precisely." },
    { icon: Server, label: "API & CI/CD webhooks", desc: "Slack, GitHub, and webhooks for pipeline integration." },
    { icon: MessageSquare, label: "Multi-agent debate", desc: "Watch agents argue trade-offs in real-time before reaching a verdict." },
    { icon: Zap, label: "Export anywhere", desc: "PDF, Markdown, HTML, CSV, or JSON — ready for your RFC or board deck." },
  ];

  return (
    <section id="features" ref={ref} style={{ borderTop: "1px solid hsl(var(--border))" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(16 76% 52%)" }}>
            Built for production
          </div>
          <h2
            className="font-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.02em", maxWidth: "18ch" }}
          >
            Everything you need to ship better systems.
          </h2>
        </motion.div>

        {/* Bento grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4 auto-rows-auto">
          {/* Wide card */}
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.45 }}
            className="lg:col-span-2 rounded-xl p-7 flex flex-col justify-between min-h-[240px]"
            style={{ background: "hsl(222 62% 11%)", border: "1px solid hsl(222 36% 20%)" }}
          >
            <div>
              <div className="h-10 w-10 rounded-lg grid place-items-center mb-4" style={{ background: "hsl(16 76% 52% / 0.15)", border: "1px solid hsl(16 76% 52% / 0.25)" }}>
                <Workflow className="h-5 w-5" style={{ color: "hsl(16 76% 60%)" }} />
              </div>
              <div className="font-display text-2xl font-semibold mb-2" style={{ color: "hsl(220 18% 92%)" }}>
                Interactive diagram viewer
              </div>
              <p className="text-sm leading-relaxed max-w-md" style={{ color: "hsl(220 14% 56%)" }}>
                Pan, zoom, and click any node to surface findings. Severity heat-map highlights where attention is needed most. Filter by agent, severity, or node.
              </p>
            </div>
            <div className="mt-5 flex items-center gap-3">
              {["Mermaid", "ReactFlow", "Interactive"].map((tag) => (
                <span key={tag} className="text-[10px] font-semibold rounded-full px-2.5 py-1"
                  style={{ background: "hsl(222 45% 18%)", color: "hsl(220 14% 56%)", border: "1px solid hsl(222 36% 24%)" }}>
                  {tag}
                </span>
              ))}
            </div>
          </motion.div>

          {features.slice(1).map((f, i) => (
            <motion.div
              key={f.label}
              initial={{ opacity: 0, y: 16 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.4, delay: 0.08 + i * 0.06 }}
              className="rounded-xl p-6 group transition-all"
              style={{
                background: "hsl(var(--card))",
                border: "1px solid hsl(var(--border))",
                boxShadow: "0 1px 4px hsl(222 62% 11% / 0.05)",
              }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLDivElement).style.transform = "translateY(-2px)"; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 8px 24px hsl(222 62% 11% / 0.10)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLDivElement).style.transform = ""; (e.currentTarget as HTMLDivElement).style.boxShadow = "0 1px 4px hsl(222 62% 11% / 0.05)"; }}
            >
              <div className="h-9 w-9 rounded-md grid place-items-center mb-4" style={{ background: "hsl(222 62% 11%)" }}>
                <f.icon className="h-4.5 w-4.5 text-white" />
              </div>
              <div className="font-semibold text-foreground mb-1.5">{f.label}</div>
              <p className="text-sm text-muted-foreground leading-relaxed">{f.desc}</p>
            </motion.div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Testimonials ────────────────────────────────────────────────────────
function Testimonials() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section ref={ref} style={{ background: "hsl(222 62% 11%)", color: "hsl(220 18% 94%)", borderTop: "1px solid hsl(222 36% 20%)" }}>
      <div className="relative overflow-hidden">
        <BlueprintGrid />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-28">
          <motion.div
            initial={{ opacity: 0, y: 16 }}
            animate={inView ? { opacity: 1, y: 0 } : {}}
            transition={{ duration: 0.5 }}
            className="mb-14"
          >
            <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(16 76% 60%)" }}>Social proof</div>
            <h2
              className="font-display font-semibold tracking-tight"
              style={{ fontSize: "clamp(2rem, 4.5vw, 3.5rem)", lineHeight: 1.08, letterSpacing: "-0.02em" }}
            >
              Loved by teams that ship.
            </h2>
          </motion.div>

          <div className="grid md:grid-cols-3 gap-5">
            {TESTIMONIALS.map((t, i) => (
              <motion.div
                key={t.name}
                initial={{ opacity: 0, y: 24 }}
                animate={inView ? { opacity: 1, y: 0 } : {}}
                transition={{ duration: 0.45, delay: i * 0.1 }}
                className="rounded-xl p-7 flex flex-col justify-between"
                style={{ background: "hsl(222 50% 14%)", border: "1px solid hsl(222 36% 22%)" }}
              >
                <div>
                  {/* Stars */}
                  <div className="flex items-center gap-1 mb-5">
                    {Array.from({ length: 5 }).map((_, s) => (
                      <Star key={s} className="h-3.5 w-3.5" fill="hsl(36 90% 52%)" style={{ color: "hsl(36 90% 52%)" }} />
                    ))}
                  </div>
                  {/* Big quote mark */}
                  <div className="font-display text-5xl leading-none mb-4 select-none" style={{ color: "hsl(16 76% 52% / 0.4)" }}>"</div>
                  <p className="text-sm leading-relaxed" style={{ color: "hsl(220 14% 76%)" }}>{t.quote}</p>
                </div>
                <div className="flex items-center gap-3 mt-7 pt-5" style={{ borderTop: "1px solid hsl(222 36% 20%)" }}>
                  <div
                    className="h-9 w-9 rounded-full grid place-items-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "hsl(16 76% 52%)" }}
                  >
                    {t.avatar}
                  </div>
                  <div>
                    <div className="text-sm font-semibold">{t.name}</div>
                    <div className="text-xs" style={{ color: "hsl(220 14% 48%)" }}>{t.role}</div>
                  </div>
                </div>
              </motion.div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

// ── FAQ ─────────────────────────────────────────────────────────────────
function FAQ() {
  const [openIdx, setOpenIdx] = useState<number | null>(null);
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-80px" });

  return (
    <section id="faq" ref={ref} style={{ borderTop: "1px solid hsl(var(--border))" }}>
      <div className="max-w-3xl mx-auto px-4 md:px-8 py-28">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={inView ? { opacity: 1, y: 0 } : {}}
          transition={{ duration: 0.5 }}
          className="mb-14"
        >
          <div className="text-[10px] font-bold uppercase tracking-[0.18em] mb-4" style={{ color: "hsl(16 76% 52%)" }}>FAQ</div>
          <h2
            className="font-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(2rem, 4vw, 3rem)", lineHeight: 1.1, letterSpacing: "-0.02em" }}
          >
            Questions? Answered.
          </h2>
        </motion.div>

        <div className="rounded-xl overflow-hidden" style={{ border: "1px solid hsl(var(--border))" }}>
          {FAQS.map((faq, i) => (
            <div
              key={i}
              style={{ borderBottom: i < FAQS.length - 1 ? "1px solid hsl(var(--border))" : "none" }}
            >
              <button
                onClick={() => setOpenIdx(openIdx === i ? null : i)}
                className="w-full flex items-center justify-between px-6 py-5 text-left transition-colors"
                style={{ background: openIdx === i ? "hsl(var(--muted))" : "transparent" }}
                onMouseEnter={(e) => { if (openIdx !== i) (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))"; }}
                onMouseLeave={(e) => { if (openIdx !== i) (e.currentTarget as HTMLButtonElement).style.background = "transparent"; }}
              >
                <span className="font-semibold text-sm pr-8">{faq.q}</span>
                <div className="flex-shrink-0 h-6 w-6 rounded-full grid place-items-center" style={{ background: "hsl(16 76% 52% / 0.1)", color: "hsl(16 76% 52%)" }}>
                  {openIdx === i ? <Minus className="h-3.5 w-3.5" /> : <Plus className="h-3.5 w-3.5" />}
                </div>
              </button>
              <motion.div
                initial={false}
                animate={{ height: openIdx === i ? "auto" : 0, opacity: openIdx === i ? 1 : 0 }}
                transition={{ duration: 0.22, ease: "easeInOut" }}
                style={{ overflow: "hidden" }}
              >
                <p className="px-6 pb-5 text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </motion.div>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

// ── Final CTA ───────────────────────────────────────────────────────────
function FinalCTA() {
  const ref = useRef<HTMLElement>(null);
  const inView = useInView(ref, { once: true, margin: "-60px" });
  const [started, setStarted] = useState(false);
  const score = useCountUp(81, 1000, started);

  useEffect(() => {
    if (inView) setStarted(true);
  }, [inView]);

  return (
    <section ref={ref} style={{ background: "hsl(222 62% 11%)", borderTop: "1px solid hsl(222 36% 18%)" }}>
      <div className="relative overflow-hidden">
        <BlueprintGrid />
        <div className="relative max-w-7xl mx-auto px-4 md:px-8 py-32">
          <div className="grid lg:grid-cols-2 gap-16 items-center">

            {/* Left */}
            <motion.div
              initial={{ opacity: 0, y: 20 }}
              animate={inView ? { opacity: 1, y: 0 } : {}}
              transition={{ duration: 0.55 }}
            >
              <h2
                className="font-display font-semibold tracking-tight"
                style={{
                  fontSize: "clamp(2.4rem, 5vw, 4rem)",
                  lineHeight: 1.06,
                  letterSpacing: "-0.02em",
                  color: "hsl(220 18% 94%)",
                }}
              >
                Your next architecture review takes{" "}
                <span style={{ color: "hsl(16 76% 60%)", fontStyle: "italic" }}>3 minutes.</span>
              </h2>
              <p className="mt-6 text-base leading-relaxed max-w-md" style={{ color: "hsl(220 14% 56%)" }}>
                Stop scheduling design reviews. Get an honest, exhaustive opinion the moment you save the diagram.
              </p>
              <Link to="/signup" className="inline-block mt-9">
                <button
                  className="inline-flex items-center gap-2 rounded-md px-8 py-4 text-sm font-semibold text-white transition-all"
                  style={{ background: "hsl(16 76% 52%)", boxShadow: "0 2px 16px hsl(16 76% 52% / 0.35)" }}
                  onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-2px)"; e.currentTarget.style.boxShadow = "0 8px 28px hsl(16 76% 52% / 0.5)"; }}
                  onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = "0 2px 16px hsl(16 76% 52% / 0.35)"; }}
                >
                  Get started for free <ArrowRight className="h-4 w-4" />
                </button>
              </Link>
            </motion.div>

            {/* Right — terminal readout */}
            <motion.div
              initial={{ opacity: 0, x: 20 }}
              animate={inView ? { opacity: 1, x: 0 } : {}}
              transition={{ duration: 0.6, delay: 0.15 }}
            >
              <div
                className="rounded-xl overflow-hidden font-mono text-sm"
                style={{ background: "hsl(222 56% 7%)", border: "1px solid hsl(222 36% 18%)" }}
              >
                <div className="flex items-center gap-2 px-4 py-3" style={{ borderBottom: "1px solid hsl(222 36% 14%)", background: "hsl(222 58% 6%)" }}>
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(0 72% 52%)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(36 90% 52%)" }} />
                  <div className="h-2.5 w-2.5 rounded-full" style={{ background: "hsl(155 60% 38%)" }} />
                  <span className="ml-2 text-[11px]" style={{ color: "hsl(220 14% 36%)" }}>archmind analysis complete</span>
                </div>
                <div className="p-5 space-y-1.5 text-xs">
                  <div style={{ color: "hsl(220 14% 40%)" }}>$ archmind analyze checkout-v3.mmd</div>
                  <div style={{ color: "hsl(220 14% 40%)" }}>→ Parsing diagram… done</div>
                  <div style={{ color: "hsl(220 14% 40%)" }}>→ Running 7 agents in parallel…</div>
                  {AGENTS.map((a, i) => (
                    <div key={a.key} style={{ color: i < 4 ? "hsl(155 60% 48%)" : "hsl(220 14% 36%)" }}>
                      {i < 4 ? "✓" : "○"} {a.name.padEnd(28)} {i < 4 ? `${AGENT_SCORES[i]}/100` : ""}
                    </div>
                  ))}
                  <div className="pt-2" style={{ color: "hsl(220 14% 40%)", borderTop: "1px solid hsl(222 36% 16%)" }}>
                    ──────────────────────────────
                  </div>
                  <div className="flex items-center gap-3">
                    <span style={{ color: "hsl(220 14% 40%)" }}>Overall score:</span>
                    <span
                      className="font-semibold text-base tabular-nums"
                      style={{ color: "hsl(155 60% 50%)" }}
                    >
                      {score}/100
                    </span>
                  </div>
                  <div style={{ color: "hsl(36 90% 52%)" }}>→ 3 critical findings need attention</div>
                  <div style={{ color: "hsl(220 14% 40%)" }}>→ Report ready at /analyses/xyz</div>
                </div>
              </div>
            </motion.div>
          </div>
        </div>
      </div>
    </section>
  );
}

// ── Footer ──────────────────────────────────────────────────────────────
function SiteFooter() {
  return (
    <footer style={{ background: "hsl(222 65% 9%)", color: "hsl(220 14% 52%)", borderTop: "1px solid hsl(222 36% 16%)" }}>
      <div className="max-w-7xl mx-auto px-4 md:px-8 py-14 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <div className="mb-3"><Logo /></div>
          <p className="text-sm leading-relaxed max-w-xs" style={{ color: "hsl(220 14% 44%)" }}>
            AI-powered architecture intelligence for engineering teams who care about quality.
          </p>
          <div className="mt-5 flex gap-1">
            {[
              { href: GITHUB_URL, icon: Github, label: "GitHub" },
              { href: "https://slack.com", icon: Slack, label: "Slack" },
            ].map((s) => (
              <a
                key={s.label}
                href={s.href}
                target="_blank"
                rel="noreferrer"
                aria-label={s.label}
                className="h-8 w-8 rounded-md grid place-items-center transition-colors"
                style={{ color: "hsl(220 14% 44%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "hsl(220 14% 44%)"; }}
              >
                <s.icon className="h-4 w-4" />
              </a>
            ))}
          </div>
        </div>

        <FooterCol title="Product" links={[
          { label: "Features", href: "#features" },
          { label: "Agents", href: "#agents" },
          { label: "Pricing", to: "/pricing" },
          { label: "Changelog", href: `${GITHUB_URL}/releases`, external: true },
        ]} />
        <FooterCol title="Company" links={[
          { label: "About", to: "/about" },
          { label: "Careers", to: "/careers" },
          { label: "Contact", to: "/contact" },
          { label: "Blog", href: GITHUB_URL, external: true },
        ]} />
        <FooterCol title="Legal" links={[
          { label: "Privacy", to: "/privacy" },
          { label: "Terms", to: "/terms" },
          { label: "Security", to: "/security" },
          { label: "DPA", to: "/privacy" },
        ]} />
      </div>

      <div style={{ borderTop: "1px solid hsl(222 36% 14%)" }}>
        <div className="max-w-7xl mx-auto px-4 md:px-8 py-5 flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between text-xs" style={{ color: "hsl(220 14% 34%)" }}>
          <span>© 2026 ArchMind AI, Inc.</span>
          <span>Made for engineers who hate bad diagrams.</span>
        </div>
      </div>
    </footer>
  );
}

type FooterLink = { label: string; href?: string; to?: string; external?: boolean };
function FooterCol({ title, links }: { title: string; links: FooterLink[] }) {
  return (
    <div>
      <div className="text-sm font-semibold mb-4" style={{ color: "hsl(220 18% 68%)" }}>{title}</div>
      <ul className="space-y-2.5 text-sm">
        {links.map((l) => (
          <li key={l.label}>
            {l.to ? (
              <Link to={l.to}
                className="transition-colors"
                style={{ color: "hsl(220 14% 44%)" }}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "hsl(220 14% 44%)"; }}
              >{l.label}</Link>
            ) : (
              <a href={l.href}
                className="transition-colors"
                style={{ color: "hsl(220 14% 44%)" }}
                target={l.external ? "_blank" : undefined}
                rel={l.external ? "noreferrer" : undefined}
                onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "white"; }}
                onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.color = "hsl(220 14% 44%)"; }}
              >{l.label}</a>
            )}
          </li>
        ))}
      </ul>
    </div>
  );
}
