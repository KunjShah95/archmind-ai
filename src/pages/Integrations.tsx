import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import {
  GitPullRequest,
  CheckCircle,
  Copy,
  Terminal,
  Loader2,
  Code,
  ArrowRight,
  ExternalLink,
  Github,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type { GithubWebhookPayload } from "@/lib/api";

const SAMPLE_PAYLOAD = {
  action: "opened-mock",
  repository: {
    full_name: "acme-co/ecommerce-platform",
  },
  pull_request: {
    number: 42,
    title: "Setup Kubernetes configuration & Terraform infrastructure",
  },
  changed_files: [
    {
      filename: "infrastructure/terraform/main.tf",
      content: 'resource "aws_db_instance" "default" {\n  allocated_storage    = 20\n  engine               = "postgres"\n  engine_version       = "16"\n  instance_class       = "db.t3.micro"\n  username             = "admin"\n  password             = "super-secret-password-123"\n  parameter_group_name = "default.postgres16"\n  skip_final_snapshot  = true\n}'
    },
    {
      filename: "deployments/kubernetes/frontend-deployment.yaml",
      content: 'apiVersion: apps/v1\nkind: Deployment\nmetadata:\n  name: frontend\nspec:\n  replicas: 3\n  template:\n    spec:\n      containers:\n      - name: web\n        image: nginx:1.25\n        ports:\n        - containerPort: 80'
    }
  ]
};

function GithubImportCard() {
  const navigate = useNavigate();
  const [repoUrl, setRepoUrl] = useState("");
  const importMutation = useMutation({
    mutationFn: () => api.githubImport(repoUrl),
    onSuccess: (analysis) => {
      toast.success("Repository imported — analysis running.");
      navigate(`/analyses/${analysis.id}`);
    },
    onError: (e) => toast.error(e instanceof Error ? e.message : "Import failed"),
  });

  return (
    <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
      <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
        <Github className="h-4.5 w-4.5 text-primary" />
        Analyze a GitHub repository
      </h3>
      <p className="text-xs text-muted-foreground">
        Paste a public repository URL. ArchMind maps its structure (frontend, API, database, containers,
        CI/CD) into an architecture diagram and runs the full multi-agent review.
      </p>
      <form
        className="flex flex-col sm:flex-row gap-2"
        onSubmit={(e) => {
          e.preventDefault();
          if (repoUrl.trim()) importMutation.mutate();
        }}
      >
        <Input
          value={repoUrl}
          onChange={(e) => setRepoUrl(e.target.value)}
          placeholder="https://github.com/owner/repo"
          className="font-mono text-xs"
        />
        <button
          type="submit"
          disabled={!repoUrl.trim() || importMutation.isPending}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all shrink-0 disabled:opacity-50 disabled:cursor-not-allowed"
          style={{ background: "hsl(16 76% 52%)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
        >
          {importMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Importing…
            </>
          ) : (
            <>
              Import & analyze
              <ArrowRight className="h-4 w-4 ml-1.5" />
            </>
          )}
        </button>
      </form>
    </div>
  );
}

export default function Integrations() {
  const [webhookUrl] = useState("http://localhost:8000/api/analyses/integrations/webhook/github");
  const [copied, setCopied] = useState(false);
  const [payloadText, setPayloadText] = useState(JSON.stringify(SAMPLE_PAYLOAD, null, 2));
  const [reviewOutput, setReviewOutput] = useState<string>("");

  const webhookMutation = useMutation({
    mutationFn: (payload: GithubWebhookPayload) => api.githubPrWebhook(payload),
    onSuccess: (data) => {
      setReviewOutput(data.comments_markdown || "Review completed successfully.");
      toast.success("Webhook pull request reviewed successfully!");
    },
    onError: () => {
      toast.error("Failed to process webhook review.");
    },
  });

  const handleCopy = () => {
    navigator.clipboard.writeText(webhookUrl);
    setCopied(true);
    toast.success("Webhook URL copied to clipboard!");
    setTimeout(() => setCopied(false), 2000);
  };

  const handleTestWebhook = () => {
    try {
      const parsed = JSON.parse(payloadText);
      setReviewOutput("");
      webhookMutation.mutate(parsed);
    } catch (e) {
      toast.error("Invalid JSON payload.");
    }
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="CI/CD Integrations"
        description="Connect ArchMind AI to your code repository host to automatically review infrastructure and API schema files on every Pull Request."
      />

      <GithubImportCard />

      <div className="grid lg:grid-cols-3 gap-6">
        {/* Left Side: Setup Instructions */}
        <div className="lg:col-span-1 space-y-6">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
              <Terminal className="h-4.5 w-4.5 text-primary" />
              GitHub Webhook Setup
            </h3>
            <ol className="text-xs text-muted-foreground list-decimal pl-4 space-y-3 leading-normal">
              <li>Navigate to your GitHub repository **Settings** &gt; **Webhooks** &gt; **Add Webhook**.</li>
              <li>
                Paste the Webhook URL:
                <div className="flex items-center gap-1 mt-1.5 p-1.5 bg-background rounded border border-border">
                  <span className="font-mono text-[10px] truncate select-all">{webhookUrl}</span>
                  <button
                    onClick={handleCopy}
                    className="p-1 hover:bg-muted text-muted-foreground hover:text-foreground rounded transition"
                  >
                    <Copy className="h-3 w-3" />
                  </button>
                </div>
              </li>
              <li>Set content type to `application/json`.</li>
              <li>Select **Let me select individual events** &gt; Check **Pull Requests**.</li>
              <li>Click **Add webhook** to activate security auditing.</li>
            </ol>
            <div className="pt-2 border-t border-border">
              <a
                href="https://docs.github.com/en/webhooks"
                target="_blank"
                rel="noreferrer"
                className="text-[10px] text-primary flex items-center gap-1 hover:underline font-semibold"
              >
                View GitHub Webhook Documentation
                <ExternalLink className="h-2.5 w-2.5" />
              </a>
            </div>
          </div>
        </div>

        {/* Right Side: Mock Payload Tester */}
        <div className="lg:col-span-2 space-y-6">
          <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
            <h3 className="font-display font-semibold text-sm flex items-center gap-1.5">
              <GitPullRequest className="h-4.5 w-4.5 text-primary" />
              Webhook Payload Audit Simulation
            </h3>
            <p className="text-xs text-muted-foreground">
              Simulate a repository pull request webhook. Edit the payload below to test custom file contents for Terraform, Kubernetes, or Docker Compose structures.
            </p>

            <div className="space-y-2">
              <Label className="text-xs font-semibold uppercase tracking-wider text-muted-foreground">GitHub PR Webhook Payload (JSON)</Label>
              <Textarea
                value={payloadText}
                onChange={(e) => setPayloadText(e.target.value)}
                className="font-mono text-xs min-h-[220px] bg-background/60"
              />
            </div>

            <div className="flex justify-end">
              <button
                onClick={handleTestWebhook}
                disabled={webhookMutation.isPending}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "hsl(16 76% 52%)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >
                {webhookMutation.isPending ? (
                  <>
                    <Loader2 className="h-4 w-4 mr-2 animate-spin" />
                    Auditing PR Files...
                  </>
                ) : (
                  <>
                    Run Webhook Simulation
                    <ArrowRight className="h-4 w-4 ml-1.5" />
                  </>
                )}
              </button>
            </div>
          </div>

          {reviewOutput && (
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
              <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                <Code className="h-4.5 w-4.5 text-emerald-400" />
                Generated PR Comment Output (Markdown)
              </h4>
              <div className="p-4 rounded-lg bg-background border border-border overflow-x-auto">
                <pre className="text-xs text-muted-foreground font-mono whitespace-pre-wrap leading-normal">
                  {reviewOutput}
                </pre>
              </div>
            </div>
          )}
        </div>
      </div>
    </div>
  );
}
