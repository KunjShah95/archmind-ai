import { useState } from "react";
import { Link } from "react-router-dom";
import { useMutation } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { getSlackWebhook, setSlackWebhook } from "@/lib/integrations";

export default function Settings() {
  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <PageHeader title="Settings" description="Account, preferences, and integrations." />

      <Tabs defaultValue="profile">
        <TabsList>
          <TabsTrigger value="profile">Profile</TabsTrigger>
          <TabsTrigger value="notifications">Notifications</TabsTrigger>
          <TabsTrigger value="integrations">Integrations</TabsTrigger>
          <TabsTrigger value="api">API</TabsTrigger>
        </TabsList>

        <TabsContent value="profile" className="mt-6">
          <SectionCard title="Profile" description="Update your personal information.">
            <div className="flex items-center gap-4 mb-5">
              <Avatar className="h-16 w-16">
                <AvatarFallback className="text-lg font-bold text-white" style={{ background: "hsl(16 76% 52%)" }}>AC</AvatarFallback>
              </Avatar>
              <Button variant="outline" size="sm">Change avatar</Button>
            </div>
            <div className="grid sm:grid-cols-2 gap-4">
              <Field label="Full name" defaultValue="Alex Chen" />
              <Field label="Email" defaultValue="alex@archmind.ai" />
              <Field label="Title" defaultValue="Principal Engineer" />
              <Field label="Company" defaultValue="ArchMind AI" />
            </div>
            <div className="mt-6 flex justify-end">
              <button
                onClick={() => toast.success("Saved")}
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all"
                style={{ background: "hsl(16 76% 52%)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
              >Save changes</button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="notifications" className="mt-6">
          <SectionCard title="Notifications" description="Choose what you want to hear about.">
            {[
              { t: "Analysis complete", d: "Email when an analysis finishes." },
              { t: "Critical findings", d: "Notify on critical-severity findings." },
              { t: "Team activity", d: "Daily digest of workspace activity." },
              { t: "Product updates", d: "Occasional feature announcements." },
            ].map((n) => (
              <div key={n.t} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div>
                  <div className="text-sm font-medium">{n.t}</div>
                  <div className="text-xs text-muted-foreground">{n.d}</div>
                </div>
                <Switch defaultChecked />
              </div>
            ))}
          </SectionCard>
        </TabsContent>

        <TabsContent value="integrations" className="mt-6 space-y-6">
          <SlackIntegrationCard />
          <SectionCard title="GitHub" description="Import repositories and review PRs via webhooks.">
            <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 py-1">
              <div>
                <div className="text-sm font-medium">Repository import & PR webhooks</div>
                <div className="text-xs text-muted-foreground">
                  Analyze a public repo's architecture, or wire a PR webhook for CI/CD reviews.
                </div>
              </div>
              <Button asChild variant="outline" size="sm">
                <Link to="/integrations">Open GitHub integrations</Link>
              </Button>
            </div>
          </SectionCard>
        </TabsContent>

        <TabsContent value="api" className="mt-6">
          <SectionCard title="API keys" description="Programmatic access for your CI/CD pipeline.">
            <div className="rounded-md border border-border bg-muted/30 p-3 font-mono text-xs">
              sk_live_••••••••••••••••••••••••••••rZc4
            </div>
            <div className="mt-4 flex gap-2">
              <Button variant="outline" size="sm">Rotate key</Button>
              <Button variant="outline" size="sm">View docs</Button>
            </div>
          </SectionCard>
        </TabsContent>
      </Tabs>
    </div>
  );
}

function SlackIntegrationCard() {
  const [webhook, setWebhook] = useState(getSlackWebhook());
  const testMutation = useMutation({
    mutationFn: () => api.slackTest(webhook),
    onSuccess: () => toast.success("Test message sent to Slack."),
    onError: (e) => toast.error(e instanceof Error ? e.message : "Slack test failed"),
  });

  const save = () => {
    if (webhook && !webhook.startsWith("https://hooks.slack.com/")) {
      toast.error("Webhook must start with https://hooks.slack.com/");
      return;
    }
    setSlackWebhook(webhook);
    toast.success(webhook ? "Slack webhook saved" : "Slack webhook removed");
  };

  return (
    <SectionCard title="Slack" description="Send analysis findings to a Slack channel via an incoming webhook.">
      <div className="space-y-1.5">
        <Label htmlFor="slack-webhook">Incoming webhook URL</Label>
        <Input
          id="slack-webhook"
          value={webhook}
          onChange={(e) => setWebhook(e.target.value)}
          placeholder="https://hooks.slack.com/services/T000/B000/XXXX"
        />
        <p className="text-xs text-muted-foreground">
          Create one in Slack: Apps → Incoming Webhooks → Add to channel. Stored locally in your browser.
        </p>
      </div>
      <div className="mt-4 flex flex-wrap gap-2 justify-end">
        <Button
          variant="outline"
          size="sm"
          disabled={!webhook || testMutation.isPending}
          onClick={() => testMutation.mutate()}
        >
          {testMutation.isPending ? "Sending…" : "Send test message"}
        </Button>
        <button
          onClick={save}
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all"
          style={{ background: "hsl(16 76% 52%)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
        >Save</button>
      </div>
    </SectionCard>
  );
}

function SectionCard({ title, description, children }: { title: string; description: string; children: React.ReactNode }) {
  return (
    <div className="rounded-xl border border-border bg-card p-6">
      <h3 className="font-display font-semibold">{title}</h3>
      <p className="text-xs text-muted-foreground mb-5">{description}</p>
      {children}
    </div>
  );
}

function Field({ label, defaultValue }: { label: string; defaultValue: string }) {
  return (
    <div className="space-y-1.5">
      <Label>{label}</Label>
      <Input defaultValue={defaultValue} />
    </div>
  );
}
