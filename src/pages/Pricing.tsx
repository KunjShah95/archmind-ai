import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Check, ArrowRight } from "lucide-react";
import { cn } from "@/lib/utils";

const TIERS = [
  {
    name: "Hobby",
    price: "$0",
    period: "forever",
    description: "For solo developers exploring the platform.",
    features: ["10 analyses / month", "All 7 agents", "PDF & Markdown export", "Community support"],
    cta: "Start free",
  },
  {
    name: "Team",
    price: "$49",
    period: "/ user / month",
    description: "For engineering teams that ship every week.",
    features: ["Unlimited analyses", "Workspaces & RBAC", "Compare mode", "Slack & GitHub integrations", "Priority support"],
    cta: "Start 14-day trial",
    featured: true,
  },
  {
    name: "Enterprise",
    price: "Custom",
    period: "",
    description: "For organizations with strict compliance requirements.",
    features: ["SSO / SAML", "On-prem / VPC deploy", "SOC 2 & ISO 27001", "Custom agents", "Dedicated CSM"],
    cta: "Contact sales",
  },
];

export default function Pricing() {
  return (
    <div className="min-h-screen bg-background">
      <header className="border-b border-border/60 backdrop-blur-xl bg-background/70 sticky top-0 z-40">
        <div className="container h-14 flex items-center">
          <Logo />
          <div className="ml-auto flex items-center gap-2">
            <Link to="/login"><Button variant="ghost" size="sm">Sign in</Button></Link>
            <Link to="/signup"><Button size="sm" className="bg-gradient-primary text-primary-foreground">Get started</Button></Link>
          </div>
        </div>
      </header>

      <section className="container py-20 text-center">
        <div className="text-xs uppercase tracking-widest text-primary">Pricing</div>
        <h1 className="mt-3 font-display text-5xl font-semibold tracking-tight">Simple, predictable pricing.</h1>
        <p className="mt-4 text-muted-foreground max-w-xl mx-auto">Start free. Upgrade when your team is ready.</p>

        <div className="mt-12 grid md:grid-cols-3 gap-5 text-left">
          {TIERS.map((t) => (
            <div key={t.name}
              className={cn(
                "relative rounded-2xl border bg-card p-7 flex flex-col",
                t.featured ? "border-primary shadow-glow" : "border-border"
              )}
            >
              {t.featured && (
                <div className="absolute -top-3 left-7 px-2.5 py-0.5 rounded-full bg-gradient-primary text-[10px] uppercase tracking-widest font-semibold text-primary-foreground">
                  Most popular
                </div>
              )}
              <div className="font-display text-lg font-semibold">{t.name}</div>
              <div className="mt-3 flex items-baseline gap-1">
                <span className="font-display text-4xl font-semibold">{t.price}</span>
                <span className="text-sm text-muted-foreground">{t.period}</span>
              </div>
              <p className="mt-3 text-sm text-muted-foreground">{t.description}</p>
              <ul className="mt-6 space-y-2.5 text-sm flex-1">
                {t.features.map((f) => (
                  <li key={f} className="flex items-start gap-2">
                    <Check className="h-4 w-4 text-success mt-0.5 shrink-0" />
                    <span>{f}</span>
                  </li>
                ))}
              </ul>
              <Link to="/signup" className="mt-7">
                <Button
                  className={cn("w-full", t.featured && "bg-gradient-primary text-primary-foreground hover:opacity-90")}
                  variant={t.featured ? "default" : "outline"}
                >
                  {t.cta} <ArrowRight className="ml-1.5 h-4 w-4" />
                </Button>
              </Link>
            </div>
          ))}
        </div>

        <div className="mt-16 text-sm text-muted-foreground">
          Need something else? <a className="text-primary hover:underline" href="mailto:sales@archmind.ai">Talk to sales</a>
        </div>
      </section>
    </div>
  );
}
