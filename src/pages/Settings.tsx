import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Switch } from "@/components/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { toast } from "sonner";

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
                <AvatarFallback className="bg-gradient-primary text-primary-foreground text-lg">AC</AvatarFallback>
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
              <Button onClick={() => toast.success("Saved")} className="bg-gradient-primary text-primary-foreground">Save changes</Button>
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

        <TabsContent value="integrations" className="mt-6">
          <SectionCard title="Integrations" description="Connect ArchMind to your tools.">
            {[
              { t: "Slack", d: "Send findings to a Slack channel.", connected: true },
              { t: "GitHub", d: "Comment on PRs that change architecture.", connected: false },
              { t: "Linear", d: "Create issues from findings.", connected: false },
              { t: "Webhooks", d: "Receive events on your endpoint.", connected: true },
            ].map((i) => (
              <div key={i.t} className="flex items-center justify-between py-3 border-b border-border last:border-b-0">
                <div>
                  <div className="text-sm font-medium">{i.t}</div>
                  <div className="text-xs text-muted-foreground">{i.d}</div>
                </div>
                <Button variant={i.connected ? "outline" : "default"} size="sm">
                  {i.connected ? "Manage" : "Connect"}
                </Button>
              </div>
            ))}
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
