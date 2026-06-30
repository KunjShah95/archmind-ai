import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import {
  ArrowRight, Sparkles, ShieldCheck, Gauge, TrendingUp,
  HeartPulse, DollarSign, Wrench, Activity, FileImage, FileCode2,
  Workflow, Check, Github, Slack, Brain, Server,
  ChevronDown, Star, Quote,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Logo } from "@/components/Logo";
import { AGENTS } from "@/lib/mock-data";
import {
  Accordion, AccordionContent, AccordionItem, AccordionTrigger,
} from "@/components/ui/accordion";

const ICONS: Record<string, any> = { TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity };

// Illustrative testimonials — generic roles, not real-company endorsements.
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
    quote: "It runs on local models via Ollama, so we use it without sending any data to third parties. That made compliance sign-off trivial.",
  },
];

const FAQS = [
  {
    q: "How do the agents work?",
    a: "Each agent is a specialized LLM prompt tuned to a specific architectural concern — scalability, security, reliability, performance, cost, maintainability, and observability. They analyze your diagram components and connections in parallel, then synthesize findings into actionable recommendations.",
  },
  {
    q: "Do I need to pay for LLM API costs?",
    a: "No! ArchMind supports free and open-source LLM providers out of the box. Run locally with Ollama (no data leaves your machine), use Groq's free tier for fast cloud inference, or bring your own OpenAI-compatible endpoint. No credit card required.",
  },
  {
    q: "What diagram formats are supported?",
    a: "Mermaid, PlantUML, Draw.io, Excalidraw, Lucidchart exports, Figma exports, PNG/JPG screenshots, and PDFs. We parse the structure and rebuild an interactive graph you can explore.",
  },
  {
    q: "Can I self-host ArchMind?",
    a: "Yes. The entire stack is open-source friendly. Run the FastAPI backend + React frontend anywhere. Set OLLAMA_BASE_URL for fully offline operation with no external API dependencies.",
  },
  {
    q: "How accurate are the agent findings?",
    a: "Accuracy depends on the LLM provider. Local models (Qwen 2.5, Llama 3) provide solid general analysis. Cloud models (Groq Mixtral) offer deeper reasoning. All findings include specific, actionable recommendations — not generic advice.",
  },
  {
    q: "What about team collaboration?",
    a: "Workspaces, role-based access, compare mode, and shared report links are included. Export findings as PDF, Markdown, or JSON for your RFCs and architecture decision records.",
  },
];

const FREE_PROVIDERS = [
  { name: "Ollama", desc: "Run local models on your hardware — fully offline", icon: Server },
  { name: "Groq", desc: "Free fast inference — 30 req/s on Mixtral 8x7B", icon: Brain },
  { name: "HuggingFace", desc: "Open-source model hub with free inference API", icon: Brain },
  { name: "OpenAI-compatible", desc: "Any provider with a compatible API endpoint", icon: Server },
];

export default function Landing() {
  return (
    <div className="min-h-screen bg-background text-foreground">
      <SiteHeader />
      <Hero />
      <LogoCloud />
      <OpenSourceBanner />
      <AgentsSection />
      <DiagramSupport />
      <Workflow3Steps />
      <FeatureGrid />
      <Testimonials />
      <FAQ />
      <CTA />
      <SiteFooter />
    </div>
  );
}

function SiteHeader() {
  return (
    <header className="sticky top-0 z-40 border-b border-border/60 backdrop-blur-xl bg-background/70">
      <div className="container flex h-14 items-center">
        <Logo />
        <nav className="hidden md:flex items-center gap-7 ml-10 text-sm text-muted-foreground">
          <a href="#agents" className="hover:text-foreground transition-colors">Agents</a>
          <a href="#workflow" className="hover:text-foreground transition-colors">How it works</a>
          <a href="#features" className="hover:text-foreground transition-colors">Features</a>
          <Link to="/pricing" className="hover:text-foreground transition-colors">Pricing</Link>
        </nav>
        <div className="ml-auto flex items-center gap-2">
          <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
          <Link to="/signup"><Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">Get started</Button></Link>
        </div>
      </div>
    </header>
  );
}

function Hero() {
  return (
    <section className="relative overflow-hidden">
      <div className="absolute inset-0 bg-hero pointer-events-none" />
      <div className="absolute inset-0 grid-bg pointer-events-none" />
      <div className="container relative pt-20 pb-28 md:pt-32 md:pb-36">
        <motion.div
          initial={{ opacity: 0, y: 12 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.5 }}
          className="max-w-3xl"
        >
          <div className="inline-flex items-center gap-2 rounded-full border border-border bg-card/60 px-3 py-1 text-xs">
            <Sparkles className="h-3.5 w-3.5 text-primary" />
            <span className="text-muted-foreground">Specialized agents · Multi-format input · Production-ready</span>
          </div>
          <h1 className="mt-6 font-display text-5xl md:text-7xl font-semibold tracking-tight leading-[1.05]">
            Architecture reviews,
            <br />
            <span className="gradient-text">on autopilot.</span>
          </h1>
          <p className="mt-6 text-lg md:text-xl text-muted-foreground max-w-2xl leading-relaxed">
            Drop in any diagram — Mermaid, Excalidraw, Draw.io, PlantUML, Figma, even a screenshot —
            and get expert-level analysis from seven specialized AI agents in minutes.
          </p>
          <div className="mt-9 flex flex-wrap items-center gap-3">
            <Link to="/signup">
              <Button size="lg" className="h-12 px-6 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
                Start analyzing free <ArrowRight className="ml-1.5 h-4 w-4" />
              </Button>
            </Link>
            <Link to="/dashboard">
              <Button size="lg" variant="outline" className="h-12 px-6">View live demo</Button>
            </Link>
          </div>
          <div className="mt-6 flex items-center gap-5 text-xs text-muted-foreground">
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> No credit card</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> SOC 2 ready</div>
            <div className="flex items-center gap-1.5"><Check className="h-3.5 w-3.5 text-success" /> Self-host available</div>
          </div>
        </motion.div>

        <motion.div
          initial={{ opacity: 0, y: 30 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.7, delay: 0.2 }}
          className="relative mt-16 md:mt-20"
        >
          <div className="rounded-2xl border border-border bg-card/80 shadow-elevated overflow-hidden">
            <div className="flex items-center gap-1.5 border-b border-border/80 px-4 py-2.5 bg-muted/30">
              <div className="h-2.5 w-2.5 rounded-full bg-danger/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-warning/70" />
              <div className="h-2.5 w-2.5 rounded-full bg-success/70" />
              <div className="ml-3 text-xs text-muted-foreground font-mono">archmind.ai/analyses/checkout-v3</div>
            </div>
            <div className="grid grid-cols-12 gap-0 min-h-[420px]">
              <div className="col-span-12 md:col-span-8 border-r border-border/60 p-6 bg-[radial-gradient(ellipse_at_top_right,hsl(var(--primary)/0.12),transparent_60%)]">
                <DiagramPreview />
              </div>
              <div className="col-span-12 md:col-span-4 p-5 space-y-3">
                <div className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">Live analysis</div>
                {AGENTS.slice(0, 5).map((a, i) => {
                  const Icon = ICONS[a.icon];
                  const done = i < 3;
                  return (
                    <div key={a.key} className="flex items-center gap-3 rounded-lg border border-border/60 px-3 py-2.5 bg-background/40">
                      <div className={`h-7 w-7 rounded-md bg-gradient-to-br ${a.accent} grid place-items-center`}>
                        <Icon className="h-3.5 w-3.5 text-white" />
                      </div>
                      <div className="min-w-0 flex-1">
                        <div className="text-xs font-medium truncate">{a.name}</div>
                        <div className="text-[10px] text-muted-foreground">
                          {done ? `Score ${75 + i * 4}/100` : "Analyzing…"}
                        </div>
                      </div>
                      {done ? (
                        <Check className="h-4 w-4 text-success" />
                      ) : (
                        <div className="h-2 w-2 rounded-full bg-primary animate-pulse-glow" />
                      )}
                    </div>
                  );
                })}
              </div>
            </div>
          </div>
        </motion.div>
      </div>
    </section>
  );
}

function DiagramPreview() {
  const nodes = [
    { x: 20, y: 30, w: 110, label: "Client" },
    { x: 200, y: 30, w: 120, label: "CDN" },
    { x: 380, y: 30, w: 130, label: "API Gateway" },
    { x: 200, y: 160, w: 120, label: "Auth" },
    { x: 380, y: 160, w: 130, label: "Orders" },
    { x: 560, y: 160, w: 120, label: "Workers" },
    { x: 380, y: 290, w: 130, label: "Postgres HA" },
    { x: 560, y: 290, w: 120, label: "Redis" },
  ];
  const edges: Array<[number, number]> = [
    [0, 1], [1, 2], [2, 3], [2, 4], [4, 5], [4, 6], [5, 7], [4, 7],
  ];
  return (
    <svg viewBox="0 0 720 360" className="w-full h-auto">
      <defs>
        <linearGradient id="nodeGrad" x1="0" x2="1" y1="0" y2="1">
          <stop offset="0%" stopColor="hsl(var(--primary) / 0.18)" />
          <stop offset="100%" stopColor="hsl(var(--primary) / 0.04)" />
        </linearGradient>
      </defs>
      {edges.map(([a, b], i) => {
        const A = nodes[a], B = nodes[b];
        const ax = A.x + A.w / 2, ay = A.y + 22;
        const bx = B.x + B.w / 2, by = B.y + 22;
        return (
          <path key={i} d={`M ${ax} ${ay} C ${ax} ${(ay + by) / 2}, ${bx} ${(ay + by) / 2}, ${bx} ${by}`}
            stroke="hsl(var(--primary) / 0.5)" strokeWidth="1.2" fill="none" strokeDasharray="3 3" />
        );
      })}
      {nodes.map((n, i) => (
        <g key={i}>
          <rect x={n.x} y={n.y} width={n.w} height={44} rx={10}
            fill="url(#nodeGrad)" stroke="hsl(var(--primary) / 0.5)" strokeWidth="1" />
          <text x={n.x + n.w / 2} y={n.y + 27} textAnchor="middle"
            className="fill-foreground" fontSize="12" fontFamily="Inter, sans-serif" fontWeight="500">
            {n.label}
          </text>
        </g>
      ))}
      <circle cx={445} cy={182} r="6" fill="hsl(var(--danger))" opacity="0.9">
        <animate attributeName="r" values="6;10;6" dur="2s" repeatCount="indefinite" />
      </circle>
    </svg>
  );
}

function LogoCloud() {
  const items = ["Linear", "Vercel", "Stripe", "Notion", "Datadog", "Snowflake", "Figma"];
  return (
    <section className="border-y border-border/60 bg-card/30">
      <div className="container py-10 flex flex-wrap items-center justify-center gap-x-12 gap-y-4">
        <span className="text-xs uppercase tracking-widest text-muted-foreground">Trusted by engineering teams at</span>
        {items.map((n) => (
          <span key={n} className="text-sm font-display font-medium text-muted-foreground/80">{n}</span>
        ))}
      </div>
    </section>
  );
}

function AgentsSection() {
  return (
    <section id="agents" className="container py-24">
      <div className="max-w-2xl">
        <div className="text-xs uppercase tracking-widest text-primary">The team</div>
        <h2 className="mt-2 font-display text-4xl md:text-5xl font-semibold tracking-tight">Seven agents. One verdict.</h2>
        <p className="mt-4 text-muted-foreground text-lg">
          Each agent is a domain expert. They run in parallel, debate findings, and synthesize a single, actionable report.
        </p>
      </div>
      <div className="mt-12 grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-4">
        {AGENTS.map((a) => {
          const Icon = ICONS[a.icon];
          return (
            <motion.div
              key={a.key}
              initial={{ opacity: 0, y: 12 }}
              whileInView={{ opacity: 1, y: 0 }}
              viewport={{ once: true, margin: "-60px" }}
              transition={{ duration: 0.35 }}
              className="group relative rounded-xl border border-border bg-card p-5 hover:shadow-elevated hover:-translate-y-0.5 transition-all"
            >
              <div className={`h-10 w-10 rounded-lg bg-gradient-to-br ${a.accent} grid place-items-center mb-4`}>
                <Icon className="h-5 w-5 text-white" />
              </div>
              <div className="font-display font-semibold">{a.name}</div>
              <p className="mt-1.5 text-sm text-muted-foreground leading-relaxed">{a.description}</p>
            </motion.div>
          );
        })}
      </div>
    </section>
  );
}

function DiagramSupport() {
  const formats = [
    { name: "PNG / JPG", icon: FileImage },
    { name: "PDF", icon: FileImage },
    { name: "Mermaid", icon: FileCode2 },
    { name: "PlantUML", icon: FileCode2 },
    { name: "Draw.io", icon: Workflow },
    { name: "Excalidraw", icon: Workflow },
    { name: "Lucidchart", icon: Workflow },
    { name: "Figma export", icon: FileImage },
  ];
  return (
    <section className="border-t border-border/60 bg-card/30">
      <div className="container py-20">
        <div className="grid md:grid-cols-2 gap-12 items-center">
          <div>
            <div className="text-xs uppercase tracking-widest text-primary">Any format</div>
            <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Bring your diagram. We'll understand it.</h2>
            <p className="mt-4 text-muted-foreground">
              Hand-drawn napkins, polished Figma boards, code-as-diagram files — ArchMind ingests them
              all and rebuilds an interactive graph you can explore alongside the analysis.
            </p>
          </div>
          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
            {formats.map((f) => (
              <div key={f.name} className="rounded-lg border border-border bg-background p-4 text-center">
                <f.icon className="h-5 w-5 mx-auto text-primary" />
                <div className="mt-2 text-xs font-medium">{f.name}</div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Workflow3Steps() {
  const steps = [
    { n: "01", t: "Upload", d: "Drop a diagram, paste a Mermaid snippet, or import from a URL." },
    { n: "02", t: "Analyze", d: "Seven agents review your architecture in parallel against industry benchmarks." },
    { n: "03", t: "Act", d: "Download a report, chat with findings, or compare against a previous version." },
  ];
  return (
    <section id="workflow" className="container py-24">
      <div className="grid md:grid-cols-3 gap-6">
        {steps.map((s) => (
          <div key={s.n} className="rounded-xl border border-border bg-card p-6">
            <div className="font-mono text-xs text-primary">{s.n}</div>
            <div className="mt-2 font-display text-2xl font-semibold">{s.t}</div>
            <p className="mt-2 text-sm text-muted-foreground">{s.d}</p>
          </div>
        ))}
      </div>
    </section>
  );
}

function FeatureGrid() {
  const features = [
    { t: "Interactive viewer", d: "Pan, zoom, and click any node to surface findings.", icon: Workflow },
    { t: "Compare mode", d: "Diff two versions and see what improved (or regressed).", icon: TrendingUp },
    { t: "Team workspaces", d: "Role-based access for engineers, leads, and execs.", icon: ShieldCheck },
    { t: "Chat with findings", d: "Ask follow-ups. The agents remember the diagram.", icon: Sparkles },
    { t: "Export anywhere", d: "PDF, Markdown, HTML, or JSON — ready for your RFC.", icon: FileCode2 },
    { t: "API & integrations", d: "Slack, GitHub, and webhooks for your CI/CD pipeline.", icon: Github },
  ];
  return (
    <section id="features" className="border-t border-border/60">
      <div className="container py-24">
        <div className="max-w-2xl">
          <div className="text-xs uppercase tracking-widest text-primary">Built for production</div>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Everything you need to ship better systems.</h2>
        </div>
        <div className="mt-12 grid md:grid-cols-2 lg:grid-cols-3 gap-4">
          {features.map((f) => (
            <div key={f.t} className="rounded-xl border border-border p-5 bg-card hover:border-primary/40 transition-colors">
              <f.icon className="h-5 w-5 text-primary" />
              <div className="mt-3 font-medium">{f.t}</div>
              <p className="mt-1 text-sm text-muted-foreground">{f.d}</p>
            </div>
          ))}
        </div>
      </div>
    </section>
  );
}

function CTA() {
  return (
    <section className="container py-24">
      <div className="relative overflow-hidden rounded-2xl border border-border bg-card p-10 md:p-16 text-center">
        <div className="absolute inset-0 bg-mesh opacity-50 pointer-events-none" />
        <div className="relative">
          <h2 className="font-display text-3xl md:text-5xl font-semibold tracking-tight">
            Your next architecture review<br /> takes <span className="gradient-text">3 minutes.</span>
          </h2>
          <p className="mt-4 text-muted-foreground max-w-xl mx-auto">
            Stop scheduling design reviews. Get an honest, exhaustive opinion the moment you save the diagram.
          </p>
          <Link to="/signup" className="inline-block mt-8">
            <Button size="lg" className="h-12 px-7 bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow">
              Get started for free <ArrowRight className="ml-1.5 h-4 w-4" />
            </Button>
          </Link>
        </div>
      </div>
    </section>
  );
}

function OpenSourceBanner() {
  return (
    <section className="border-y border-border/60 bg-gradient-to-r from-primary/5 via-transparent to-primary/5">
      <div className="container py-10">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <div className="flex items-center gap-2 text-xs uppercase tracking-widest text-primary">
              <Server className="h-3.5 w-3.5" /> Free & open-source
            </div>
            <p className="mt-1 text-sm text-muted-foreground">
              Powered by local and free LLM providers — no API keys required.
            </p>
          </div>
          <div className="flex flex-wrap gap-4">
            {FREE_PROVIDERS.map((p) => (
              <div key={p.name} className="flex items-center gap-2 rounded-lg border border-border/60 bg-background/50 px-3 py-2">
                <p.icon className="h-4 w-4 text-primary" />
                <div>
                  <div className="text-xs font-medium">{p.name}</div>
                  <div className="text-[10px] text-muted-foreground">{p.desc}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </div>
    </section>
  );
}

function Testimonials() {
  return (
    <section className="container py-24">
      <div className="text-center max-w-2xl mx-auto">
        <div className="text-xs uppercase tracking-widest text-primary">Trusted by engineers</div>
        <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Loved by teams that ship.</h2>
      </div>
      <div className="mt-12 grid md:grid-cols-3 gap-5">
        {TESTIMONIALS.map((t, i) => (
          <motion.div
            key={t.name}
            initial={{ opacity: 0, y: 16 }}
            whileInView={{ opacity: 1, y: 0 }}
            viewport={{ once: true, margin: "-40px" }}
            transition={{ duration: 0.4, delay: i * 0.1 }}
            className="relative rounded-xl border border-border bg-card p-6"
          >
            <Quote className="h-6 w-6 text-primary/30 absolute top-4 right-4" />
            <div className="flex items-center gap-1 mb-4">
              {Array.from({ length: 5 }).map((_, s) => (
                <Star key={s} className="h-3.5 w-3.5 fill-amber-400 text-amber-400" />
              ))}
            </div>
            <p className="text-sm text-foreground leading-relaxed">&ldquo;{t.quote}&rdquo;</p>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-xs font-bold text-primary-foreground">
                {t.avatar}
              </div>
              <div>
                <div className="text-sm font-medium">{t.name}</div>
                <div className="text-xs text-muted-foreground">{t.role}</div>
              </div>
            </div>
          </motion.div>
        ))}
      </div>
    </section>
  );
}

function FAQ() {
  return (
    <section id="faq" className="border-t border-border/60 bg-card/30">
      <div className="container py-24 max-w-3xl mx-auto">
        <div className="text-center mb-12">
          <div className="text-xs uppercase tracking-widest text-primary">FAQ</div>
          <h2 className="mt-2 font-display text-4xl font-semibold tracking-tight">Questions? Answered.</h2>
        </div>
        <Accordion type="single" collapsible className="space-y-2">
          {FAQS.map((faq, i) => (
            <AccordionItem key={i} value={`faq-${i}`} className="rounded-xl border border-border bg-card px-5">
              <AccordionTrigger className="text-sm font-medium hover:no-underline py-4">
                {faq.q}
              </AccordionTrigger>
              <AccordionContent className="text-sm text-muted-foreground leading-relaxed pb-4">
                {faq.a}
              </AccordionContent>
            </AccordionItem>
          ))}
        </Accordion>
      </div>
    </section>
  );
}

function SiteFooter() {
  return (
    <footer className="border-t border-border/60">
      <div className="container py-12 grid grid-cols-2 md:grid-cols-5 gap-8">
        <div className="col-span-2">
          <Logo />
          <p className="mt-3 text-sm text-muted-foreground max-w-xs">AI-powered architecture intelligence for engineering teams who care.</p>
          <div className="mt-4 flex gap-2">
            <Button variant="ghost" size="icon" className="h-8 w-8"><Github className="h-4 w-4" /></Button>
            <Button variant="ghost" size="icon" className="h-8 w-8"><Slack className="h-4 w-4" /></Button>
          </div>
        </div>
        <FooterCol title="Product" links={["Features", "Agents", "Pricing", "Changelog"]} />
        <FooterCol title="Company" links={["About", "Blog", "Careers", "Contact"]} />
        <FooterCol title="Legal" links={["Privacy", "Terms", "Security", "DPA"]} />
      </div>
      <div className="border-t border-border/60">
        <div className="container py-5 text-xs text-muted-foreground flex justify-between">
          <span>© 2026 ArchMind AI, Inc.</span>
          <span>Made for engineers who hate bad diagrams.</span>
        </div>
      </div>
    </footer>
  );
}

function FooterCol({ title, links }: { title: string; links: string[] }) {
  return (
    <div>
      <div className="text-sm font-medium">{title}</div>
      <ul className="mt-3 space-y-2 text-sm text-muted-foreground">
        {links.map((l) => <li key={l}><a className="hover:text-foreground transition-colors" href="#">{l}</a></li>)}
      </ul>
    </div>
  );
}
