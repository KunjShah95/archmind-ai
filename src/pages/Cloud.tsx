import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  Cloud,
  CheckCircle,
  AlertTriangle,
  Play,
  Loader2,
  RefreshCw,
  Server,
  ShieldAlert,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";
import type {
  CloudScanResult,
  CloudDrift,
  CloudMissingComponent,
  CloudSecurityIssue,
} from "@/lib/api";

const CLOUD_PROVIDERS = [
  { value: "aws", label: "Amazon Web Services (AWS)", color: "text-orange-400" },
  { value: "gcp", label: "Google Cloud Platform (GCP)", color: "text-blue-400" },
  { value: "azure", label: "Microsoft Azure", color: "text-sky-400" },
];

export default function LiveCloud() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [provider, setProvider] = useState("aws");
  const [scanResult, setScanResult] = useState<CloudScanResult | null>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const scanMutation = useMutation({
    mutationFn: () => api.scanCloudDrift(selectedId, provider),
    onSuccess: (data) => {
      setScanResult(data);
      toast.success("Live cloud scan completed successfully!");
    },
    onError: () => {
      toast.error("Failed to run live cloud infrastructure scan.");
    },
  });

  const handleScan = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    setScanResult(null);
    scanMutation.mutate();
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Live Cloud Integrations"
        description="Verify real cloud assets against architectural blueprints. Scan configurations to detect resource drift, missing items, and security group vulnerabilities."
      />

      <div className="rounded-xl border border-border bg-card p-6 gap-6 grid md:grid-cols-2 shadow-sm">
        <div className="space-y-4">
          <div className="space-y-2">
            <Label className="text-sm font-medium">1. Select Target Architecture</Label>
            <select
              value={selectedId}
              onChange={(e) => {
                setSelectedId(e.target.value);
                setScanResult(null);
              }}
              className="w-full h-10 px-3 rounded-lg border border-border bg-background hover:bg-muted/30 transition text-sm focus:outline-none focus:ring-1 focus:ring-primary"
            >
              <option value="">-- Choose an Architecture --</option>
              {analyses.map((a) => (
                <option key={a.id} value={a.id}>
                  {a.name}
                </option>
              ))}
            </select>
          </div>

          <div className="space-y-2">
            <Label className="text-sm font-medium">2. Choose Cloud Provider</Label>
            <div className="space-y-2">
              {CLOUD_PROVIDERS.map((p) => (
                <label
                  key={p.value}
                  className={`flex items-center gap-3 p-3 rounded-lg border cursor-pointer transition ${
                    provider === p.value
                      ? "border-primary bg-primary/5"
                      : "border-border hover:bg-muted/20"
                  }`}
                >
                  <input
                    type="radio"
                    name="provider"
                    value={p.value}
                    checked={provider === p.value}
                    onChange={() => {
                      setProvider(p.value);
                      setScanResult(null);
                    }}
                    className="accent-primary"
                  />
                  <Cloud className={`h-4.5 w-4.5 ${p.color}`} />
                  <span className="text-sm font-medium">{p.label}</span>
                </label>
              ))}
            </div>
          </div>
        </div>

        {/* Credentials simulation details */}
        <div className="flex flex-col justify-between p-4 border border-dashed border-border rounded-lg bg-muted/10">
          <div className="space-y-2">
            <h4 className="text-sm font-semibold flex items-center gap-1.5">
              <Server className="h-4.5 w-4.5 text-primary" />
              Infrastructure Connection
            </h4>
            <p className="text-xs text-muted-foreground leading-relaxed">
              ArchMind AI scans read-only resource metadata using Cloud Credentials API configurations. It parses live setups to compare them with your intended designs.
            </p>
          </div>
          <button
            type="button"
            onClick={handleScan}
            disabled={!selectedId || scanMutation.isPending}
            className="w-full mt-4 rounded-md py-2.5 text-sm font-semibold text-white flex items-center justify-center gap-2 disabled:opacity-50 transition-all"
            style={{ background: "hsl(16 76% 52%)" }}
            onMouseEnter={(e) => { if (!e.currentTarget.disabled) e.currentTarget.style.transform = "translateY(-1px)"; }}
            onMouseLeave={(e) => { e.currentTarget.style.transform = ""; }}
          >
            {scanMutation.isPending ? (
              <>
                <Loader2 className="h-4 w-4 animate-spin" />
                Auditing Live Cloud Resources...
              </>
            ) : (
              <>
                <RefreshCw className="h-4 w-4" />
                Scan & Compare Resources
              </>
            )}
          </button>
        </div>
      </div>

      {scanResult && (
        <div className="space-y-6">
          {/* Summary */}
          <div className="rounded-xl border border-primary/20 bg-primary/5 p-6 space-y-2">
            <h3 className="font-display font-semibold text-lg flex items-center gap-2">
              <CheckCircle className="h-5 w-5 text-primary" />
              Scan Comparison Report
            </h3>
            <p className="text-sm text-muted-foreground">{scanResult.scan_summary}</p>
          </div>

          <div className="grid md:grid-cols-3 gap-6">
            {/* Configuration Drift Panel */}
            <div className="md:col-span-2 space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                  <AlertTriangle className="h-4.5 w-4.5 text-warning" />
                  Configuration Drift Detected
                </h4>
                {scanResult.drift.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {scanResult.drift.map((d: CloudDrift, i: number) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="flex justify-between text-xs">
                          <span className="font-semibold text-foreground">{d.resource_name}</span>
                          <span className="text-[10px] uppercase font-bold text-warning">{d.severity}</span>
                        </div>
                        <div className="grid grid-cols-3 text-xs text-muted-foreground gap-2 pt-1">
                          <div>
                            <span className="text-[10px] block text-muted-foreground uppercase font-semibold">Parameter</span>
                            {d.parameter}
                          </div>
                          <div>
                            <span className="text-[10px] block text-muted-foreground uppercase font-semibold">Intended (Blueprint)</span>
                            <span className="text-emerald-400 font-medium">{d.intended}</span>
                          </div>
                          <div>
                            <span className="text-[10px] block text-muted-foreground uppercase font-semibold">Actual (Cloud)</span>
                            <span className="text-red-400 font-medium">{d.actual}</span>
                          </div>
                        </div>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No configuration parameters drift was detected.</p>
                )}
              </div>

              {/* Missing Components */}
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                  <Server className="h-4.5 w-4.5 text-red-400" />
                  Missing Blueprint Components
                </h4>
                {scanResult.missing_components.length > 0 ? (
                  <div className="divide-y divide-border/60">
                    {scanResult.missing_components.map((mc: CloudMissingComponent, i: number) => (
                      <div key={i} className="py-3 first:pt-0 last:pb-0 space-y-1">
                        <div className="text-xs font-semibold text-foreground">{mc.label}</div>
                        <p className="text-xs text-muted-foreground">{mc.remediation}</p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">All blueprint components appear fully provisioned in the cloud.</p>
                )}
              </div>
            </div>

            {/* Cloud Security Issues */}
            <div className="space-y-4">
              <div className="rounded-xl border border-border bg-card p-5 space-y-4">
                <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                  <ShieldAlert className="h-4.5 w-4.5 text-red-500" />
                  Cloud Security Risks
                </h4>
                {scanResult.security_issues.length > 0 ? (
                  <div className="space-y-3">
                    {scanResult.security_issues.map((si: CloudSecurityIssue, i: number) => (
                      <div key={i} className="p-3 rounded-lg border border-red-500/20 bg-red-500/5 space-y-1">
                        <div className="flex justify-between text-xs font-bold text-red-400">
                          <span>{si.resource_name}</span>
                          <span className="uppercase">{si.severity}</span>
                        </div>
                        <p className="text-xs text-muted-foreground font-semibold">{si.vulnerability}</p>
                        <p className="text-[10px] text-muted-foreground pt-1 border-t border-red-500/10">
                          *Remediation:* {si.remediation}
                        </p>
                      </div>
                    ))}
                  </div>
                ) : (
                  <p className="text-xs text-muted-foreground">No major compliance/security mismatches found.</p>
                )}
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
