import { Link } from "react-router-dom";
import { SeoMeta } from "@/components/SeoMeta";
import { Logo } from "@/components/Logo";
import { Check, ArrowRight } from "lucide-react";
import { motion } from "framer-motion";

const TIERS = [
  {
    name: "Hobby",
    price: "$0",
    period: "forever",
    description: "For solo developers exploring the platform.",
    features: [
      "10 analyses / month",
      "All 7 agents",
      "PDF & Markdown export",
      "Community support",
    ],
    cta: "Start free",
    featured: false,
  },
  {
    name: "Team",
    price: "$49",
    period: "/ user / mo",
    description: "For engineering teams that ship every week.",
    features: [
      "Unlimited analyses",
      "Workspaces & RBAC",
      "Compare mode",
      "Slack & GitHub integrations",
      "Priority support",
    ],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For orgs with strict compliance requirements.",
    features: [
      "SSO / SAML",
      "On-prem / VPC deploy",
      "SOC 2 & ISO 27001",
      "Custom agents",
      "Dedicated CSM",
    ],
    cta: "Contact sales",
    featured: false,
  },
];

const FAQS = [
  { q: "Can I cancel anytime?", a: "Yes — no contracts, no lock-in. Cancel from your billing settings in one click." },
  { q: "What counts as an analysis?", a: "One upload or diagram review = one analysis. Viewing or sharing results is free." },
  { q: "Is self-hosting available on Hobby?", a: "Yes. The full stack is open-source. Hobby limits apply per deployment." },
  { q: "Do you offer non-profit or OSS discounts?", a: "Yes. Email us at sales@archmind.ai with your project details." },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background" style={{ fontFamily: "'Manrope', sans-serif" }}>
      <SeoMeta
        title="ArchMind AI – Simple, Predictable Pricing"
        description="Start free. Upgrade when your team is ready. Hobby tier: $0. Team tier: $49/user/mo. No hidden fees."
        canonicalPath="/pricing"
      />
      {/* Header */}
      <header
        className="sticky top-0 z-40 bg-background"
        style={{ borderBottom: "1px solid hsl(var(--border))" }}
      >
        <div className="container h-14 flex items-center">
          <Logo />
          <div className="ml-auto flex items-center gap-3">
            <Link
              to="/login"
              className="text-sm font-medium text-muted-foreground hover:text-foreground transition-colors"
            >
              Sign in
            </Link>
            <Link to="/signup">
              <button
                className="rounded-md px-4 py-2 text-sm font-semibold text-white transition-all"
                style={{ background: "hsl(16 76% 52%)" }}
                onMouseEnter={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "translateY(-1px)";
                  el.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.4)";
                }}
                onMouseLeave={(e) => {
                  const el = e.currentTarget;
                  el.style.transform = "";
                  el.style.boxShadow = "";
                }}
              >
                Get started
              </button>
            </Link>
          </div>
        </div>
      </header>

      {/* Hero */}
      <section className="container py-20 text-center">
        <motion.div
          initial={{ opacity: 0, y: 16 }}
          animate={{ opacity: 1, y: 0 }}
          transition={{ duration: 0.45 }}
        >
          <div className="section-label mb-4">Pricing</div>
          <h1
            className="font-display font-semibold tracking-tight"
            style={{ fontSize: "clamp(2.2rem, 4vw, 3.5rem)", lineHeight: 1.1 }}
          >
            Simple, predictable pricing.
          </h1>
          <p className="mt-4 text-muted-foreground max-w-md mx-auto">
            Start free. Upgrade when your team is ready. No hidden fees.
          </p>
        </motion.div>

        {/* Tier cards */}
        <div className="mt-14 grid md:grid-cols-3 gap-5 text-left max-w-5xl mx-auto">
          {TIERS.map((t, i) => (
            <motion.div
              key={t.name}
              initial={{ opacity: 0, y: 20 }}
              animate={{ opacity: 1, y: 0 }}
              transition={{ duration: 0.4, delay: i * 0.1 }}
              className="relative flex flex-col rounded-xl"
              style={
                t.featured
                  ? {
                      background: "hsl(222 62% 11%)",
                      border: "1px solid hsl(222 36% 20%)",
                      boxShadow: "0 12px 40px hsl(222 62% 11% / 0.25), 0 2px 8px hsl(222 62% 11% / 0.15)",
                    }
                  : {
                      background: "hsl(var(--card))",
                      border: "1px solid hsl(var(--border))",
                      boxShadow: "0 1px 3px hsl(222 62% 11% / 0.06), 0 4px 14px hsl(222 62% 11% / 0.04)",
                    }
              }
            >
              {t.featured && (
                <div
                  className="absolute -top-3 left-6 text-[10px] font-bold uppercase tracking-widest px-2.5 py-0.5 rounded-full"
                  style={{ background: "hsl(16 76% 52%)", color: "white" }}
                >
                  Most popular
                </div>
              )}

              <div className="p-7 flex flex-col flex-1">
                {/* Plan name */}
                <div
                  className="text-sm font-bold uppercase tracking-widest mb-5"
                  style={{ color: t.featured ? "hsl(16 76% 60%)" : "hsl(220 14% 52%)" }}
                >
                  {t.name}
                </div>

                {/* Price */}
                <div className="flex items-baseline gap-1.5 mb-2">
                  <span
                    className="font-display font-semibold"
                    style={{
                      fontSize: "2.8rem",
                      lineHeight: 1,
                      color: t.featured ? "hsl(220 18% 96%)" : "hsl(var(--foreground))",
                    }}
                  >
                    {t.price}
                  </span>
                  {t.period && (
                    <span
                      className="text-sm"
                      style={{ color: t.featured ? "hsl(220 14% 56%)" : "hsl(220 14% 56%)" }}
                    >
                      {t.period}
                    </span>
                  )}
                </div>

                <p
                  className="text-sm mb-7"
                  style={{ color: t.featured ? "hsl(220 14% 60%)" : "hsl(220 14% 48%)" }}
                >
                  {t.description}
                </p>

                {/* Features */}
                <ul className="space-y-3 text-sm flex-1 mb-8">
                  {t.features.map((f) => (
                    <li key={f} className="flex items-start gap-2.5">
                      <Check
                        className="h-4 w-4 mt-0.5 shrink-0"
                        style={{ color: t.featured ? "hsl(155 55% 52%)" : "hsl(155 60% 38%)" }}
                      />
                      <span style={{ color: t.featured ? "hsl(220 18% 84%)" : "hsl(var(--foreground))" }}>
                        {f}
                      </span>
                    </li>
                  ))}
                </ul>

                {/* CTA */}
                <Link to="/signup">
                  <button
                    className="w-full rounded-md py-2.5 text-sm font-semibold flex items-center justify-center gap-2 transition-all"
                    style={
                      t.featured
                        ? {
                            background: "hsl(16 76% 52%)",
                            color: "white",
                          }
                        : {
                            background: "transparent",
                            border: "1px solid hsl(var(--border))",
                            color: "hsl(var(--foreground))",
                          }
                    }
                    onMouseEnter={(e) => {
                      const el = e.currentTarget;
                      el.style.transform = "translateY(-1px)";
                      el.style.boxShadow = t.featured
                        ? "0 4px 14px hsl(16 76% 52% / 0.4)"
                        : "0 2px 8px hsl(222 62% 11% / 0.1)";
                    }}
                    onMouseLeave={(e) => {
                      const el = e.currentTarget;
                      el.style.transform = "";
                      el.style.boxShadow = "";
                    }}
                  >
                    {t.cta} <ArrowRight className="h-3.5 w-3.5" />
                  </button>
                </Link>
              </div>
            </motion.div>
          ))}
        </div>
      </section>

      {/* FAQ strip */}
      <section style={{ borderTop: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}>
        <div className="container py-16 max-w-3xl">
          <h2
            className="font-display font-semibold mb-10 text-center"
            style={{ fontSize: "1.75rem" }}
          >
            Common questions
          </h2>
          <div className="grid md:grid-cols-2 gap-8">
            {FAQS.map((faq) => (
              <div key={faq.q}>
                <div className="font-semibold text-sm mb-1.5">{faq.q}</div>
                <p className="text-sm text-muted-foreground leading-relaxed">{faq.a}</p>
              </div>
            ))}
          </div>
        </div>
      </section>

      {/* Footer strip */}
      <footer style={{ borderTop: "1px solid hsl(var(--border))" }}>
        <div className="container py-8 flex flex-col sm:flex-row items-center justify-between gap-4">
          <Logo />
          <p className="text-xs text-muted-foreground text-center sm:text-right">
            Need something custom?{" "}
            <a
              href="mailto:sales@archmind.ai"
              className="font-medium transition-colors"
              style={{ color: "hsl(16 76% 52%)" }}
            >
              Talk to sales →
            </a>
          </p>
        </div>
      </footer>
    </div>
  );
}
