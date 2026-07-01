import { useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { motion } from "framer-motion";
import {
  Sparkles, Loader2, Cloud, Users, Layers, Copy, Check,
  Database, Server, Globe, Shield, Code2, FileCode,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { toast } from "sonner";
import { api, ApiError } from "@/lib/api";

const EXAMPLES = [
  { label: "E-Commerce Platform", prompt: "Design an e-commerce platform for 10 million users with product catalog, shopping cart, checkout, payments, order management, and real-time inventory tracking." },
  { label: "SaaS Application", prompt: "Design a multi-tenant SaaS platform with subscription billing, team management, API access, and real-time dashboards." },
  { label: "Social Media App", prompt: "Design a social media application with user feeds, posts, comments, likes, real-time notifications, and media uploads for 5 million users." },
  { label: "Ride-Sharing Platform", prompt: "Design a ride-sharing platform with real-time driver matching, live location tracking, fare calculation, and payment processing." },
  { label: "Video Streaming", prompt: "Design a video streaming platform with content ingestion, adaptive bitrate streaming, content recommendations, and user analytics." },
  { label: "IoT Dashboard", prompt: "Design an IoT data platform that ingests telemetry from 100K devices, processes data in real-time, and serves dashboards with alerting." },
];

const CLOUD_PROVIDERS = [
  { value: "aws", label: "AWS", icon: Cloud },
  { value: "gcp", label: "Google Cloud", icon: Cloud },
  { value: "azure", label: "Azure", icon: Cloud },
  { value: "agnostic", label: "Cloud Agnostic", icon: Globe },
];

export default function Generator() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [prompt, setPrompt] = useState("");
  const [targetUsers, setTargetUsers] = useState("");
  const [cloudProvider, setCloudProvider] = useState("aws");
  const [copied, setCopied] = useState<string | null>(null);

  const generateMutation = useMutation({
    mutationFn: () =>
      api.generateArchitecture({
        prompt,
        target_users: targetUsers || undefined,
        cloud_provider: cloudProvider,
      }),
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Architecture generated!", {
        description: "Your architecture is being reviewed by 7 AI agents.",
      });
      navigate(`/analyses/${analysis.id}`);
    },
    onError: (err) => {
      toast.error(
        err instanceof ApiError
          ? err.message
          : err instanceof Error
            ? err.message
            : "Generation failed"
      );
    },
  });

  const copyToClipboard = (text: string, key: string) => {
    navigator.clipboard.writeText(text);
    setCopied(key);
    setTimeout(() => setCopied(null), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="AI Architecture Generator"
        description="Describe your system in plain English and let AI design a complete production-ready architecture."
      />

      {/* Prompt Input */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        className="mt-6"
      >
        <div className="rounded-2xl border border-border bg-card/60 backdrop-blur-sm p-6 shadow-lg">
          <div className="flex items-center gap-2 mb-4">
            <div className="h-9 w-9 rounded-lg bg-gradient-primary grid place-items-center shadow-glow">
              <Sparkles className="h-5 w-5 text-primary-foreground" />
            </div>
            <div>
              <h3 className="font-display font-semibold">Describe your system</h3>
              <p className="text-xs text-muted-foreground">Be specific about features, scale, and requirements</p>
            </div>
          </div>

          <Textarea
            value={prompt}
            onChange={(e) => setPrompt(e.target.value)}
            placeholder="Design an e-commerce platform for 10 million users with product catalog, shopping cart, checkout, payments, order management, and real-time inventory tracking..."
            className="font-mono text-sm min-h-[140px] bg-background/60 border-border/50 focus:border-primary/50"
          />

          <div className="mt-3 flex flex-wrap gap-1.5">
            {EXAMPLES.map((ex) => (
              <button
                key={ex.label}
                type="button"
                onClick={() => setPrompt(ex.prompt)}
                className="text-xs px-2.5 py-1 rounded-full border border-border bg-muted/40 hover:bg-muted hover:border-primary/30 transition-colors text-muted-foreground hover:text-foreground"
              >
                {ex.label}
              </button>
            ))}
          </div>
        </div>
      </motion.div>

      {/* Options */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.1 }}
        className="mt-5 rounded-xl border border-border bg-card p-5"
      >
        <div className="flex items-center gap-2 mb-4">
          <Layers className="h-4 w-4 text-primary" />
          <span className="font-medium text-sm">Configuration</span>
        </div>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="space-y-2">
            <Label className="text-xs font-medium">Target Scale</Label>
            <Input
              value={targetUsers}
              onChange={(e) => setTargetUsers(e.target.value)}
              placeholder="e.g., 10 million users"
              className="bg-background/60"
            />
          </div>
          <div className="space-y-2">
            <Label className="text-xs font-medium">Cloud Provider</Label>
            <div className="grid grid-cols-2 gap-2">
              {CLOUD_PROVIDERS.map((p) => (
                <button
                  key={p.value}
                  type="button"
                  onClick={() => setCloudProvider(p.value)}
                  className={`flex items-center gap-2 px-3 py-2 rounded-lg border text-sm transition-all ${
                    cloudProvider === p.value
                      ? "border-primary bg-primary/10 text-primary font-medium"
                      : "border-border bg-background/60 text-muted-foreground hover:border-primary/30"
                  }`}
                >
                  <p.icon className="h-3.5 w-3.5" />
                  {p.label}
                </button>
              ))}
            </div>
          </div>
        </div>
      </motion.div>

      {/* Generate Button */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.2 }}
        className="mt-6 flex justify-end"
      >
        <Button
          size="lg"
          disabled={prompt.trim().length < 10 || generateMutation.isPending}
          onClick={() => generateMutation.mutate()}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow px-8"
        >
          {generateMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Generating architecture…
            </>
          ) : (
            <>
              <Sparkles className="h-4 w-4 mr-2" />
              Generate Architecture
            </>
          )}
        </Button>
      </motion.div>

      {/* What you'll get */}
      <motion.div
        initial={{ opacity: 0, y: 20 }}
        animate={{ opacity: 1, y: 0 }}
        transition={{ delay: 0.3 }}
        className="mt-10"
      >
        <h3 className="font-display text-lg font-semibold mb-4">What you'll get</h3>
        <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-3">
          {[
            { icon: Layers, label: "Architecture Diagram", desc: "Interactive React Flow diagram" },
            { icon: Database, label: "Database Design", desc: "Choices with rationale" },
            { icon: Server, label: "Tech Stack", desc: "Full stack recommendations" },
            { icon: Shield, label: "API Gateway", desc: "Auth, rate limiting, routing" },
            { icon: Globe, label: "CDN Strategy", desc: "Edge caching rules" },
            { icon: Code2, label: "Kubernetes", desc: "Deployment manifests" },
            { icon: FileCode, label: "Terraform", desc: "Infrastructure as code" },
            { icon: Users, label: "AI Review", desc: "7-agent architecture review" },
          ].map((item) => (
            <div
              key={item.label}
              className="rounded-lg border border-border bg-card/40 p-4 hover:bg-card transition-colors"
            >
              <item.icon className="h-5 w-5 text-primary mb-2" />
              <div className="text-sm font-medium">{item.label}</div>
              <div className="text-xs text-muted-foreground mt-0.5">{item.desc}</div>
            </div>
          ))}
        </div>
      </motion.div>
    </div>
  );
}
