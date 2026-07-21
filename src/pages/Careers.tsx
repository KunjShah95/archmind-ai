import { Link } from "react-router-dom";
import { motion } from "framer-motion";
import { Github, ArrowRight, MapPin, Clock } from "lucide-react";
import { SeoMeta } from "@/components/SeoMeta";
import { Logo } from "@/components/Logo";

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

const PERKS = [
  { title: "Fully remote", desc: "Work from anywhere. Async-first culture." },
  { title: "Open source first", desc: "Most of your work ships publicly." },
  { title: "Small team", desc: "Real ownership, real impact from day one." },
  { title: "No meetings culture", desc: "Default to written, async communication." },
];

const OPEN_ROLES = [
  {
    title: "Full-Stack Engineer",
    team: "Product",
    location: "Remote",
    type: "Full-time",
    desc: "Own features end-to-end across the React frontend and FastAPI backend. Experience with Python, TypeScript, and LLM APIs preferred.",
  },
  {
    title: "AI / ML Engineer",
    team: "Agents",
    location: "Remote",
    type: "Full-time",
    desc: "Design and improve the seven specialized analysis agents. Deep knowledge of prompt engineering, RAG, and local model deployment (Ollama, vLLM).",
  },
  {
    title: "Developer Advocate",
    team: "Community",
    location: "Remote",
    type: "Part-time / Contract",
    desc: "Help engineers discover ArchMind. Create tutorials, speak at meetups, and engage with the open-source community on GitHub.",
  },
];

export default function Careers() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <SeoMeta
        title="Careers at ArchMind AI – Join the Team"
        description="Help engineers ship better systems. We're hiring remote engineers, AI/ML specialists, and developer advocates."
        canonicalPath="/careers"
      />
      {/* Header */}
      <header className="sticky top-0 z-40 bg-background" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container h-14 flex items-center justify-between px-4">
          <Logo />
          <div className="flex items-center gap-4">
            <Link to="/about" className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors">
              About
            </Link>
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noreferrer"
              className="rounded-md px-4 py-2 text-sm font-semibold text-white"
              style={{ background: "hsl(16 76% 52%)", transition: "transform 0.15s ease, box-shadow 0.15s ease" }}
              onMouseEnter={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = "translateY(-1px)"; el.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.4)"; }}
              onMouseLeave={(e) => { const el = e.currentTarget as HTMLAnchorElement; el.style.transform = ""; el.style.boxShadow = ""; }}
            >
              Apply now
            </a>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section style={{ background: "hsl(222 62% 11%)", color: "hsl(220 18% 94%)", backgroundImage: "radial-gradient(hsl(220 30% 35% / 0.35) 1px, transparent 1px)", backgroundSize: "28px 28px" }}>
        <div className="container px-4 py-24 md:py-32 max-w-4xl">
          <motion.div initial={{ opacity: 0, y: 20 }} animate={{ opacity: 1, y: 0 }} transition={{ duration: 0.5 }}>
            <div className="text-xs font-bold uppercase tracking-widest mb-6" style={{ color: "hsl(16 76% 60%)" }}>
              Careers at ArchMind
            </div>
            <h1 className="font-display font-semibold tracking-tight mb-6" style={{ fontSize: "clamp(2.4rem, 5vw, 4rem)", lineHeight: 1.08, color: "hsl(220 18% 96%)" }}>
              Help engineers ship{" "}
              <span style={{ color: "hsl(16 76% 60%)", fontStyle: "italic" }}>better systems.</span>
            </h1>
            <p className="text-lg leading-relaxed max-w-2xl" style={{ color: "hsl(220 14% 64%)" }}>
              We're a small team building tooling for the engineers who build everything else.
              If that sounds like meaningful work to you, we'd love to talk.
            </p>
          </motion.div>
        </div>
      </section>

      {/* Perks */}
      <section className="bg-muted" style={{ borderBottom: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-16 max-w-4xl">
          <div className="section-label mb-4">How we work</div>
          <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-4">
            {PERKS.map((p, i) => (
              <motion.div
                key={p.title}
                initial={{ opacity: 0, y: 12 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.3, delay: i * 0.07 }}
                className="p-5 rounded-lg bg-card"
                style={{ border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="font-semibold text-sm mb-1.5">{p.title}</div>
                <p className="text-xs text-muted-foreground leading-relaxed">{p.desc}</p>
              </motion.div>
            ))}
          </div>
        </div>
      </section>

      {/* Open roles */}
      <section>
        <div className="container px-4 py-20 max-w-4xl">
          <div className="section-label mb-4">Open roles</div>
          <h2 className="font-display font-semibold tracking-tight mb-10" style={{ fontSize: "1.875rem" }}>
            {OPEN_ROLES.length} positions available.
          </h2>
          <div className="space-y-4">
            {OPEN_ROLES.map((role, i) => (
              <motion.div
                key={role.title}
                initial={{ opacity: 0, y: 14 }}
                whileInView={{ opacity: 1, y: 0 }}
                viewport={{ once: true }}
                transition={{ duration: 0.35, delay: i * 0.08 }}
                className="rounded-lg p-6 hover-lift"
                style={{ border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-sm)" }}
              >
                <div className="flex flex-wrap items-start justify-between gap-4">
                  <div className="flex-1 min-w-0">
                    <div className="flex flex-wrap items-center gap-2 mb-1">
                      <h3 className="font-semibold">{role.title}</h3>
                      <span
                        className="text-[10px] font-bold uppercase tracking-widest px-2 py-0.5 rounded"
                        style={{ background: "hsl(16 76% 52% / 0.1)", color: "hsl(16 76% 44%)" }}
                      >
                        {role.team}
                      </span>
                    </div>
                    <div className="flex items-center gap-4 text-xs text-muted-foreground mb-3">
                      <span className="flex items-center gap-1"><MapPin className="h-3 w-3" />{role.location}</span>
                      <span className="flex items-center gap-1"><Clock className="h-3 w-3" />{role.type}</span>
                    </div>
                    <p className="text-sm text-muted-foreground leading-relaxed">{role.desc}</p>
                  </div>
                  <a
                    href={`${GITHUB_URL}/issues`}
                    target="_blank"
                    rel="noreferrer"
                    className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold shrink-0 transition-all"
                    style={{ background: "hsl(222 62% 11%)", color: "white", transition: "transform 0.15s ease" }}
                    onMouseEnter={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = "translateY(-1px)"; }}
                    onMouseLeave={(e) => { (e.currentTarget as HTMLAnchorElement).style.transform = ""; }}
                  >
                    Apply <ArrowRight className="h-3.5 w-3.5" />
                  </a>
                </div>
              </motion.div>
            ))}
          </div>

          <div className="mt-12 p-8 rounded-lg text-center bg-muted" style={{ border: "1px solid hsl(var(--border))" }}>
            <div className="font-semibold mb-2">Don't see your role?</div>
            <p className="text-sm text-muted-foreground mb-5">
              We hire for character and capability. If you're passionate about developer tooling
              and great software, reach out anyway.
            </p>
            <a
              href={`${GITHUB_URL}/discussions`}
              target="_blank"
              rel="noreferrer"
              className="inline-flex items-center gap-2 text-sm font-semibold transition-colors"
              style={{ color: "hsl(16 76% 52%)" }}
            >
              <Github className="h-4 w-4" /> Introduce yourself on GitHub Discussions
            </a>
          </div>
        </div>
      </section>

      {/* Footer */}
      <footer className="bg-muted" style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container px-4 py-6 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <div className="flex items-center gap-5 text-xs text-muted-foreground">
            <Link to="/about" className="hover:text-foreground transition-colors">About</Link>
            <Link to="/privacy" className="hover:text-foreground transition-colors">Privacy</Link>
            <Link to="/contact" className="hover:text-foreground transition-colors">Contact</Link>
          </div>
        </div>
      </footer>
    </div>
  );
}
