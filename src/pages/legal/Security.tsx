import { StaticPageShell, PageSection } from "./StaticPageShell";

const GITHUB_URL = "https://github.com/KunjShah95/archmind-ai";

export default function Security() {
  return (
    <StaticPageShell title="Security">
      <PageSection title="Our approach">
        <p>
          ArchMind analyzes architecture diagrams — content that often describes the inner workings
          of your systems. We treat that content as sensitive by default. This page describes the
          practical measures we take to protect it. Our practices are aligned with industry best
          practices; we do not currently hold formal certifications such as SOC 2 or ISO 27001 and
          we will not claim otherwise.
        </p>
      </PageSection>

      <PageSection title="Encryption in transit">
        <p>
          All traffic between your browser and the hosted service is encrypted with TLS. Requests
          from the backend to configured LLM providers and other integrations are likewise made
          over HTTPS. Plain-HTTP endpoints are not exposed by the hosted service.
        </p>
      </PageSection>

      <PageSection title="Token and credential handling">
        <ul className="list-disc pl-5 space-y-2">
          <li>
            Authentication uses short-lived session tokens issued by our auth provider; tokens are
            never written to server logs.
          </li>
          <li>
            LLM provider API keys you supply are stored encrypted at rest and are used only to make
            inference requests on your behalf. They are never exposed to other users or returned in
            full by the API after being saved.
          </li>
          <li>
            Integration tokens (e.g. GitHub, Slack) are scoped to the minimum permissions the
            feature requires, and you can revoke them at any time from your settings or the
            upstream provider.
          </li>
        </ul>
      </PageSection>

      <PageSection title="Data isolation and access">
        <p>
          Workspaces are isolated with role-based access control, and database access is restricted
          by row-level authorization so that users can only read the analyses in workspaces they
          belong to. Production access by maintainers is limited, logged, and used only for
          operating the service.
        </p>
      </PageSection>

      <PageSection title="Keep your data on your own hardware">
        <p>
          The strongest guarantee we can offer is architectural: ArchMind supports fully local
          operation. Run the stack self-hosted with a local Ollama endpoint and your diagrams never
          leave your network — there is no phone-home telemetry in the analysis pipeline. For
          regulated environments, this is the deployment mode we recommend.
        </p>
      </PageSection>

      <PageSection title="Development practices">
        <ul className="list-disc pl-5 space-y-2">
          <li>The codebase is developed in the open and can be audited by anyone.</li>
          <li>Dependencies are kept current, and known-vulnerability alerts on the repository are triaged.</li>
          <li>Changes go through review and automated checks before release.</li>
        </ul>
      </PageSection>

      <PageSection title="Responsible disclosure">
        <p>
          We welcome reports from security researchers. If you believe you have found a
          vulnerability in ArchMind, please report it via{" "}
          <a
            href={`${GITHUB_URL}/issues`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GitHub issues
          </a>{" "}
          on our repository. For sensitive reports, please avoid including exploit details in the
          public issue — open a minimal issue and we will coordinate a private channel for the
          specifics.
        </p>
        <p>We ask that you:</p>
        <ul className="list-disc pl-5 space-y-2">
          <li>Give us a reasonable time to remediate before public disclosure.</li>
          <li>Avoid accessing or modifying data that is not your own.</li>
          <li>Do not run disruptive testing (e.g. denial of service) against the hosted service.</li>
        </ul>
        <p>
          We do not currently run a paid bug-bounty program, but we credit reporters in release
          notes when a fix ships (unless you prefer to stay anonymous).
        </p>
      </PageSection>

      <PageSection title="Incident response">
        <p>
          If we become aware of a security incident affecting your data, we will investigate,
          contain, and notify affected users without undue delay, including the nature of the
          incident and the steps we are taking.
        </p>
      </PageSection>

      <PageSection title="Questions">
        <p>
          For anything security-related that is not a vulnerability report, start a thread in{" "}
          <a
            href={`${GITHUB_URL}/discussions`}
            target="_blank"
            rel="noreferrer"
            className="text-primary hover:underline"
          >
            GitHub discussions
          </a>
          .
        </p>
      </PageSection>
    </StaticPageShell>
  );
}
