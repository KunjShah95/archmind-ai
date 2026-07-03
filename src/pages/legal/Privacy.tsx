import { StaticPageShell, PageSection } from "./StaticPageShell";

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

export default function Privacy() {
  return (
    <StaticPageShell title="Privacy Policy">
      <PageSection title="Overview">
        <p>
          ArchMind AI ("ArchMind", "we", "us") provides AI-powered architecture analysis for
          engineering teams. This policy explains what data we collect when you use the hosted
          service, how it is used, and the choices you have — including running ArchMind entirely
          on your own infrastructure so that no data reaches us at all.
        </p>
      </PageSection>

      <PageSection title="Data we collect">
        <p>When you use the hosted service, we collect:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="text-foreground font-medium">Account data</span> — your email address,
            display name, and authentication identifiers used to sign you in and manage your
            workspace membership.
          </li>
          <li>
            <span className="text-foreground font-medium">Content you upload</span> — architecture
            diagrams (images, PDFs, Mermaid, PlantUML, Draw.io, Excalidraw, and similar files),
            text prompts, and the analysis results, reports, and chat messages generated from them.
          </li>
          <li>
            <span className="text-foreground font-medium">Usage data</span> — basic product events
            (e.g. analyses started, features used) and technical logs (IP address, browser type,
            timestamps) used for security, debugging, and capacity planning.
          </li>
          <li>
            <span className="text-foreground font-medium">Billing data</span> — if you purchase a
            paid plan, payment is handled by our payment processor; we do not store full card
            numbers.
          </li>
        </ul>
        <p>
          We do not sell your data, and we do not use your diagrams or analysis content to train
          machine-learning models.
        </p>
      </PageSection>

      <PageSection title="LLM providers and how your diagrams are processed">
        <p>
          ArchMind's analysis agents are powered by large language models. Where your diagram
          content is sent depends on the provider you configure:
        </p>
        <ul className="list-disc pl-5 space-y-2">
          <li>
            <span className="text-foreground font-medium">Local models (Ollama)</span> — when you
            configure a local Ollama endpoint, diagram content is processed on your own hardware
            and never leaves your machine or network.
          </li>
          <li>
            <span className="text-foreground font-medium">Cloud providers</span> — if you configure
            a cloud provider (such as Groq, Hugging Face, or any OpenAI-compatible endpoint),
            diagram content and prompts are transmitted to that provider under its own terms and
            privacy policy. We recommend reviewing the provider's data-retention practices before
            enabling it for sensitive diagrams.
          </li>
        </ul>
        <p>
          API keys you supply for third-party providers are stored encrypted and used only to make
          requests on your behalf.
        </p>
      </PageSection>

      <PageSection title="Self-hosting">
        <p>
          ArchMind can be self-hosted. When you run the backend and frontend on your own
          infrastructure with a local LLM (e.g. Ollama), ArchMind AI, Inc. receives no account
          data, content, or telemetry from your deployment. In a self-hosted deployment, you are
          the data controller and this policy applies only to any interactions you have with our
          hosted services (such as our website or GitHub repository).
        </p>
      </PageSection>

      <PageSection title="How we use data">
        <ul className="list-disc pl-5 space-y-2">
          <li>To provide, maintain, and improve the service.</li>
          <li>To authenticate you and secure your workspace.</li>
          <li>To respond to support requests and communicate service updates.</li>
          <li>To detect abuse, fraud, and security incidents.</li>
          <li>To comply with legal obligations.</li>
        </ul>
      </PageSection>

      <PageSection title="Subprocessors">
        <p>
          The hosted service relies on a small number of infrastructure subprocessors, which may
          include: cloud hosting providers (for compute and storage), an authentication and
          database provider, a payment processor for paid plans, and the LLM inference providers
          you explicitly configure. Each subprocessor is bound by contractual obligations to
          protect your data. A current list is available on request via GitHub.
        </p>
      </PageSection>

      <PageSection title="Data retention and deletion">
        <p>
          Your diagrams and analyses are retained for as long as your account is active so that you
          can revisit and compare them. You can delete individual analyses at any time, and you can
          request deletion of your entire account and associated data. Backups are purged on a
          rolling schedule after deletion.
        </p>
      </PageSection>

      <PageSection title="Your rights (GDPR and similar laws)">
        <p>
          Depending on where you live, you may have the right to access, correct, export, restrict
          the processing of, or delete your personal data, and to object to certain processing. If
          you are in the EU/EEA or UK, these rights are granted by the GDPR. To exercise any of
          these rights, open an issue or discussion on our{" "}
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GitHub repository
          </a>{" "}
          and we will respond within the timelines required by applicable law.
        </p>
      </PageSection>

      <PageSection title="Security">
        <p>
          Data is encrypted in transit using TLS. Credentials and provider API keys are stored
          encrypted at rest. Our practices are aligned with industry best practices; see our{" "}
          <a href="/security" className="text-primary hover:underline">
            Security page
          </a>{" "}
          for details. We do not claim any formal certifications.
        </p>
      </PageSection>

      <PageSection title="Children">
        <p>
          ArchMind is not directed at children under 16, and we do not knowingly collect personal
          data from them.
        </p>
      </PageSection>

      <PageSection title="Changes to this policy">
        <p>
          We may update this policy as the product evolves. Material changes will be announced in
          the repository changelog, and the "Last updated" date above will always reflect the
          current version.
        </p>
      </PageSection>

      <PageSection title="Contact">
        <p>
          Questions about privacy? Reach us through{" "}
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GitHub issues
          </a>
          .
        </p>
      </PageSection>
    </StaticPageShell>
  );
}
