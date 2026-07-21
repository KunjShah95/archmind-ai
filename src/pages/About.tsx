import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, ArrowRight, Zap, Shield, Users, Code2 } from "lucide-react";
import { SeoMeta } from "@/components/SeoMeta";
import { Logo } from "@/components/Logo";

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

const VALUES = [
  {
    icon: Zap,
    title: "Speed over ceremony",
    desc: "Architecture reviews shouldn't need a calendar invite. We built ArchMind so teams get expert feedback the moment a diagram is saved.",
  },
  {
    icon: Shield,
    title: "Privacy by default",
    desc: "Run entirely on your own hardware with Ollama. No data leaves your machine unless you choose a cloud provider.",
  },
  {
    icon: Users,
    title: "Built for teams",
    desc: "Workspaces, role-based access, compare mode, and shared reports — because good architecture decisions are made together.",
  },
  {
    icon: Code2,
    title: "Open by nature",
    desc: "The full stack is open source. Read the code, contribute a fix, or self-host in your own VPC. No vendor lock-in.",
  },
];

const TEAM = [
  { name: "Kunj Shah", role: "Founder & Engineer", initials: "KS" },
  { name: "AI Agents", role: "Scalability · Security · Reliability · Performance · Cost · Maintainability · Observability", initials: "×7" },
];

export default function About() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <SeoMeta
        title="About ArchMind AI – The AI Staff Architect"
        description="ArchMind provides AI-powered architecture reviews for engineering teams. Learn about our mission, values, and open-source approach."
        canonicalPath="/about"
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container h-14 flex items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              Home
            </Link>
            <Link to="/signup">
              <button
                className="rounded-md px-4 py-2 text-sm font-semibold text-white"
                style={{ background: "hsl(16 76% 52%)", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
                onMouseEnter={(e) => { const el = e.currentTarget; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.4)"; }}
                onMouseLeave={(e) => { const el = e.currentTarget; el.style.transform = ""; el.style.boxShadow = ""; }}
              >
                Get started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "hsl(222 62% 11%)", color: "hsl(220 18% 94%)", backgroundImage: "radial-gradient(hsl(220 30% 35% / 0.35) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <div className="container px-4 py-24 md:py-32 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "hsl(16 76% 60%)" }}>
              About ArchMind
            </div>
            <h1 className="font-display font-semibold tracking-tight mb-6" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 1.08, color: "hsl(220 18% 96%)" }}>
              We built the senior architect{" "}
              <span style={{ color: "hsl(16 76% 60%)", fontStyle: "italic" }}>every team deserves</span>{" "}
              but can't always hire.
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "hsl(220 14% 64%)" }}>
              ArchMind started from a simple frustration: architecture reviews were either too slow,
              too expensive, or too shallow. Seven specialized AI agents now do in minutes what used
              to take days of back-and-forth.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Mission */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-20 max-w-4xl">
          <div className="grid md:grid-cols-2 gap-14 items-start">
            <div>
              <div className="section-label mb-4">Our mission</div>
              <h2 className="font-display font-semibold tracking-tight mb-5" style={{ fontSize: "1.875rem", lineHeight: 1.2 }}>
                Make expert architecture review accessible to every engineering team.
              </h2>
              <p className="text-muted-foreground leading-relaxed text-sm mb-4">
                Not just the ones with seven-figure engineering budgets. A two-person startup and a
                500-person enterprise should both ship systems that are secure, scalable, and
                maintainable — and both should know <em>before</em> they hit production.
              </p>
              <p className="text-muted-foreground leading-relaxed text-sm">
                ArchMind is built to be free for individuals, affordable for teams, and deployable
                on your own infrastructure so nobody has to choose between speed and security.
              </p>
            </div>
            <div className="space-y-4">
              {[
                { stat: "7", label: "Specialized AI agents" },
                { stat: "< 3m", label: "Average analysis time" },
                { stat: "100%", label: "Open source core" },
                { stat: "0", label: "Required API keys" },
              ].map((s) => (
                <div key={s.label} className="flex items-center gap-5 p-5 rounded-lg bg-muted" style={{ border: "1px solid hsl(var(--border))" }}>
                  <div className="font-display font-semibold shrink-0" style={{ fontSize: "2rem", color: "hsl(16 76% 52%)" }}>{s.stat}</div>
                  <div className="text-sm font-medium text-foreground">{s.label}</div>
                </div>
              ))}
            </div>
          </div>
        </div>
      </section>

      {/* Values */}
      <section className="bg-muted" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-20 max-w-4xl">
          <div className="section-label mb-4">What we believe</div>
          <h2 className="font-display font-semibold tracking-tight mb-12" style={{ fontSize: "1.875rem" }}>
            Four principles that guide every decision.
          </h2>
          <div className="grid sm:grid-cols-2 gap-6">
            {VALUES.map((v, i) => (
              <motion.div
                key={v.title}
                initial={{ opacity: 0, y: 16 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="p-6 rounded-lg bg-card card-accent-hover"
                style={{ border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="h-9 w-9 rounded-md grid place-items-center mb-4" style={{ background: "hsl(222 62% 11%)" }}>
                  <v.icon className="h-4 w-4 text-white" />
                </div>
                <div className="font-semibold mb-2">{v.title}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{v.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Team */}
      <section style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-20 max-w-4xl">
          <div className="section-label mb-4">The team</div>
          <h2 className="font-display font-semibold tracking-tight mb-12" style={{ fontSize: "1.875rem" }}>
            Humans and agents, working together.
          </h2>
          <div className="grid sm:grid-cols-2 gap-5">
            {TEAM.map((t) => (
              <div key={t.name} className="flex items-center gap-4 p-5 rounded-lg" style={{ border: "1px solid hsl(var(--border))" }}>
                <div className="h-12 w-12 rounded-full grid place-items-center font-bold text-white shrink-0" style={{ background: "hsl(16 76% 52%)", fontSize: "0.875rem" }}>
                  {t.initials}
                </div>
                <div>
                  <div className="font-semibold">{t.name}</div>
                  <div className="text-xs text-muted-foreground mt-0.5 leading-relaxed">{t.role}</div>
                </div>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Open source CTA */}
      <section>
        <div className="container px-4 py-20 max-w-4xl text-center">
          <div className="section-label mb-4">Open source</div>
          <h2 className="font-display font-semibold tracking-tight mb-4" style={{ fontSize: "1.875rem" }}>
            Built in the open. Contributions welcome.
          </h2>
          <p className="text-muted-foreground text-sm max-w-lg mx-auto mb-8 leading-relaxed">
            ArchMind is MIT-licensed. Star the repo, file an issue, or send a pull request.
            The community makes it better for everyone.
          </p>
          <div className="flex flex-wrap items-center justify-center gap-4">
            <a
              href={GITHUB_URL}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold text-white transition-all"
              style={{ background: "hsl(222 62% 11%)", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-2px)"; el.style.boxShadow = "0 6px 20px hsl(222 62% 11% / 0.3)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = ""; el.style.boxShadow = ""; }}
            >
              <Github className="h-4 w-4" /> View on GitHub
            </a>
            <Link
              to="/careers"
              className="inline-flex items-center gap-2 rounded-md px-5 py-2.5 text-sm font-semibold transition-all"
              style={{ border: "1px solid hsl(var(--border))", color: "hsl(222 62% 11%)", transition: "border-color 0.15s ease" }}
              onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(16 76% 52%)"; }}
              onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.borderColor = "hsl(var(--border))"; }}
            >
              Join the team <ArrowRight className="h-4 w-4" />
            </Link>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/terms" className="hover:text-foreground transition-colors">Terms</Link>
            <Link to="/careers" className="hover:text-foreground transition-colors">Careers</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
