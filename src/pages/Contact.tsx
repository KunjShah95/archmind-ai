import { Github, MessagesSquare, Bug, BookOpen } from "lucide-react";
import { StaticPageShell, PageSection } from "./legal/StaticPageShell";

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

const CHANNELS = [
  {
    title: "Bug reports & support",
    desc: "Something broken, or stuck on setup? Open an issue with steps to reproduce and we'll take a look.",
    href: `${GITHUB_URL}/issues`,
    cta: "Open a GitHub issue",
    icon: Bug,
  },
  {
    title: "Community & questions",
    desc: "Ideas, feedback, architecture questions, or show-and-tell — the discussions board is the place.",
    href: `${GITHUB_URL}/discussions`,
    cta: "Join the discussions",
    icon: MessagesSquare,
  },
  {
    title: "Source code",
    desc: "Browse the code, read the docs, star the repo, or send a pull request. Contributions are welcome.",
    href: GITHUB_URL,
    cta: "View the repository",
    icon: Github,
  },
];

export default function Contact() {
  return (
    <StaticPageShell title="Contact">
      <PageSection title="Talk to us on GitHub">
        <p>
          ArchMind is built in the open, so all support and conversation happens on GitHub. There
          is no contact form and no ticketing system — a public issue or discussion is the fastest
          way to reach the maintainers, and it helps the next person with the same question.
        </p>
      </PageSection>

      <div className="grid gap-4 sm:grid-cols-1">
        {CHANNELS.map((c) => (
          <a
            key={c.title}
            href={c.href}
            target="_blank"
            rel="noreferrer"
            className="group rounded-lg bg-card p-5 transition-all hover-lift"
            style={{ border: "1px solid hsl(var(--border))", boxShadow: "var(--shadow-card)" }}
          >
            <div className="flex items-start gap-4">
              <div
                className="h-10 w-10 shrink-0 rounded-lg grid place-items-center"
                style={{ background: "hsl(222 62% 11%)" }}
              >
                <c.icon className="h-5 w-5 text-white" />
              </div>
              <div className="min-w-0">
                <div className="font-semibold">{c.title}</div>
                <p className="mt-1 text-sm text-muted-foreground leading-relaxed">{c.desc}</p>
                <div className="mt-2 text-sm font-medium" style={{ color: "hsl(16 76% 52%)" }}>{c.cta} →</div>
              </div>
            </div>
          </a>
        ))}
      </div>

      <PageSection title="Before you file an issue">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Search{" "}
            <a
              href={`${GITHUB_URL}/issues`}
              target="_blank"
              rel="noreferrer"
              className="text-primary hover:underline"
            >
              existing issues
            </a>{" "}
            first — your problem may already have a fix or workaround.
          </li>
          <li>
            Include your setup: hosted or self-hosted, which LLM provider (Ollama, Groq, or an
            OpenAI-compatible endpoint), and the diagram format you were using.
          </li>
          <li>
            For security vulnerabilities, see the guidance on our{" "}
            <a href="/security" className="text-primary hover:underline">
              Security page
            </a>{" "}
            instead of posting exploit details publicly.
          </li>
        </ul>
      </PageSection>

      <PageSection title="Response times">
        <p className="flex items-start gap-2">
          <BookOpen className="h-4 w-4 mt-0.5 shrink-0 text-primary" />
          <span>
            ArchMind is maintained by a small team. We triage new issues regularly, but responses
            are best-effort — clear, reproducible reports get answered fastest.
          </span>
        </p>
      </PageSection>
    </StaticPageShell>
  );
}
