import { Link } from "react-router-dom";
import { Logo } from "@/components/Logo";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Github } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { toast } from "sonner";

export function AuthShell({ title, subtitle, cta, footer, alt }: {
  title: string; subtitle: string; cta: string;
  footer: React.ReactNode; alt: React.ReactNode;
}) {
  const navigate = useNavigate();
  const submit = (e: React.FormEvent) => {
    e.preventDefault();
    // TODO: wire up Supabase auth
    toast.success("Welcome to ArchMind AI");
    navigate("/dashboard");
  };
  const oauth = (provider: string) => {
    // TODO: wire up Supabase OAuth (Google/GitHub)
    toast.info(`${provider} sign-in coming soon`);
    navigate("/dashboard");
  };
  return (
    <div className="min-h-screen grid lg:grid-cols-2">
      <div className="hidden lg:block relative bg-card border-r border-border overflow-hidden">
        <div className="absolute inset-0 bg-hero" />
        <div className="absolute inset-0 grid-bg" />
        <div className="relative p-10 flex flex-col h-full">
          <Logo />
          <div className="mt-auto max-w-md">
            <blockquote className="font-display text-2xl leading-snug">
              "We replaced a 90-minute design review with a 4-minute ArchMind run.
              The agents catch things our staff engineers miss."
            </blockquote>
            <div className="mt-5 flex items-center gap-3">
              <div className="h-9 w-9 rounded-full bg-gradient-primary grid place-items-center text-sm font-semibold text-primary-foreground">RK</div>
              <div>
                <div className="text-sm font-medium">Riya Kapoor</div>
                <div className="text-xs text-muted-foreground">Principal Engineer · Lumen Labs</div>
              </div>
            </div>
          </div>
        </div>
      </div>
      <div className="flex items-center justify-center p-6 md:p-10">
        <div className="w-full max-w-sm">
          <div className="lg:hidden mb-8"><Logo /></div>
          <h1 className="font-display text-3xl font-semibold tracking-tight">{title}</h1>
          <p className="mt-2 text-sm text-muted-foreground">{subtitle}</p>

          <div className="mt-7 grid grid-cols-2 gap-2">
            <Button variant="outline" onClick={() => oauth("Google")}>
              <svg className="h-4 w-4 mr-1.5" viewBox="0 0 24 24"><path fill="currentColor" d="M21.35 11.1H12v3.2h5.35c-.23 1.4-1.66 4.1-5.35 4.1-3.22 0-5.85-2.66-5.85-5.95s2.63-5.95 5.85-5.95c1.83 0 3.06.78 3.76 1.45l2.56-2.47C16.55 3.95 14.5 3 12 3 6.95 3 2.85 7.05 2.85 12s4.1 9 9.15 9c5.28 0 8.78-3.7 8.78-8.92 0-.6-.06-1.05-.13-1.48z"/></svg>
              Google
            </Button>
            <Button variant="outline" onClick={() => oauth("GitHub")}>
              <Github className="h-4 w-4 mr-1.5" /> GitHub
            </Button>
          </div>

          <div className="my-5 flex items-center gap-3 text-xs text-muted-foreground">
            <div className="h-px flex-1 bg-border" /> or continue with email <div className="h-px flex-1 bg-border" />
          </div>

          <form onSubmit={submit} className="space-y-3">
            <div className="space-y-1.5">
              <Label htmlFor="email">Email</Label>
              <Input id="email" type="email" placeholder="you@company.com" required />
            </div>
            <div className="space-y-1.5">
              <Label htmlFor="password">Password</Label>
              <Input id="password" type="password" placeholder="••••••••" required />
            </div>
            <Button type="submit" className="w-full bg-gradient-primary text-primary-foreground hover:opacity-90">
              {cta}
            </Button>
          </form>

          <div className="mt-5 text-sm text-muted-foreground">{alt}</div>
          <div className="mt-8 text-xs text-muted-foreground">{footer}</div>
          <Link to="/" className="mt-6 inline-block text-xs text-muted-foreground hover:text-foreground">← Back to site</Link>
        </div>
      </div>
    </div>
  );
}
