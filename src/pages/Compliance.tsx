import { useState } from "react";
import { useQuery, useMutation } from "@tanstack/react-query";
import { useSearchParams } from "react-router-dom";
import {
  ShieldCheck,
  Loader2,
  CheckCircle,
  AlertTriangle,
  Play,
  FileText,
  Lock,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { api } from "@/lib/api";

const FRAMEWORKS = [
  { key: "soc_2", name: "SOC 2 Type II", focus: "Trust services security policies" },
  { key: "iso_27001", name: "ISO/IEC 27001", focus: "Information security management system" },
  { key: "gdpr", name: "GDPR Alignment", focus: "Personal privacy & user consent data" },
  { key: "hipaa", name: "HIPAA Security", focus: "Health information safeguards" },
  { key: "pci_dss", name: "PCI DSS v4.0", focus: "Payment card transactions data" },
];

export default function Compliance() {
  const [searchParams] = useSearchParams();
  const initialId = searchParams.get("analysisId") || "";

  const [selectedId, setSelectedId] = useState<string>(initialId);
  const [activeTab, setActiveTab] = useState("soc_2");
  const [complianceData, setComplianceData] = useState<any>(null);

  const { data: analyses = [] } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const complianceMutation = useMutation({
    mutationFn: (id: string) => api.getComplianceAudit(id),
    onSuccess: (data) => {
      setComplianceData(data);
      toast.success("Compliance readiness audited!");
    },
    onError: () => {
      toast.error("Failed to execute compliance audit.");
    },
  });

  const handleRunAudit = () => {
    if (!selectedId) {
      toast.error("Please select an architecture.");
      return;
    }
    setComplianceData(null);
    complianceMutation.mutate(selectedId);
  };

  const getScoreColor = (score: number) => {
    if (score >= 80) return "text-emerald-400";
    if (score >= 60) return "text-yellow-400";
    return "text-red-400";
  };

  const getScoreProgressBg = (score: number) => {
    if (score >= 80) return "bg-emerald-500";
    if (score >= 60) return "bg-yellow-500";
    return "bg-red-500";
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto space-y-8">
      <PageHeader
        title="Compliance & Security Audits"
        description="Verify regulatory compliance readiness. Trace architecture components directly to security controls requirements."
      />

      {/* Select Architecture */}
      <div className="rounded-xl border border-border bg-card p-6 flex flex-col md:flex-row items-end gap-4 shadow-sm">
        <div className="flex-1 space-y-2">
          <Label className="text-sm font-medium">Select Target Architecture</Label>
          <select
            value={selectedId}
            onChange={(e) => {
              setSelectedId(e.target.value);
              setComplianceData(null);
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
        <Button
          size="lg"
          onClick={handleRunAudit}
          disabled={!selectedId || complianceMutation.isPending}
          className="text-white" style={{ background: "hsl(16 76% 52%)" }}
        >
          {complianceMutation.isPending ? (
            <>
              <Loader2 className="h-4 w-4 mr-2 animate-spin" />
              Auditing Controls...
            </>
          ) : (
            <>
              <Play className="h-4 w-4 mr-2 fill-current" />
              Audit Security Controls
            </>
          )}
        </Button>
      </div>

      {complianceData && (
        <div className="grid md:grid-cols-3 gap-6">
          {/* Framework Checklist Sidebar */}
          <div className="space-y-3">
            {FRAMEWORKS.map((f) => {
              const auditObj = complianceData.readiness[f.key];
              const score = auditObj ? auditObj.score : 0;
              const isSelected = activeTab === f.key;

              return (
                <button
                  key={f.key}
                  onClick={() => setActiveTab(f.key)}
                  className={`w-full text-left p-4 rounded-xl border transition flex flex-col justify-between h-[100px] ${
                    isSelected
                      ? "border-primary bg-primary/5 ring-1 ring-primary/20"
                      : "border-border bg-card/60 hover:bg-card"
                  }`}
                >
                  <div className="flex justify-between w-full items-start">
                    <span className="text-xs font-bold text-foreground truncate max-w-[150px]">{f.name}</span>
                    <span className={`text-xs font-bold font-mono ${getScoreColor(score)}`}>{score}% Ready</span>
                  </div>
                  <div className="w-full space-y-1">
                    <div className="w-full h-1.5 rounded-full bg-border overflow-hidden">
                      <div
                        className={`h-full ${getScoreProgressBg(score)} transition-all`}
                        style={{ width: `${score}%` }}
                      />
                    </div>
                    <span className="text-[10px] text-muted-foreground block truncate">{f.focus}</span>
                  </div>
                </button>
              );
            })}
          </div>

          {/* Framework Gap Report Details */}
          <div className="md:col-span-2 space-y-6">
            <div className="rounded-xl border border-border bg-card p-6 space-y-4 shadow-sm">
              <div className="flex items-center gap-2 border-b border-border pb-3">
                <ShieldCheck className="h-5 w-5 text-primary" />
                <h3 className="font-display font-semibold text-base">
                  {FRAMEWORKS.find((f) => f.key === activeTab)?.name} Gap Report
                </h3>
              </div>

              {complianceData.readiness[activeTab]?.gaps.length > 0 ? (
                <div className="space-y-3">
                  <span className="text-xs font-bold text-red-400 flex items-center gap-1.5 uppercase">
                    <AlertTriangle className="h-4 w-4" />
                    Missing Security Controls
                  </span>
                  <div className="space-y-2">
                    {complianceData.readiness[activeTab].gaps.map((gap: string, i: number) => (
                      <div
                        key={i}
                        className="flex items-start gap-2.5 p-3 rounded-lg border border-red-500/15 bg-red-500/5 text-xs text-muted-foreground"
                      >
                        <Lock className="h-3.5 w-3.5 text-red-400 shrink-0 mt-0.5" />
                        <span>{gap}</span>
                      </div>
                    ))}
                  </div>
                </div>
              ) : (
                <div className="flex items-center gap-2 p-4 rounded-lg border border-emerald-500/20 bg-emerald-500/5 text-emerald-400 text-xs">
                  <CheckCircle className="h-4 w-4" />
                  All reviewed controls satisfy this compliance checklist!
                </div>
              )}
            </div>

            {/* General Action Plan */}
            <div className="rounded-xl border border-border bg-card p-5 space-y-3 shadow-sm">
              <h4 className="font-display font-semibold text-sm flex items-center gap-1.5">
                <FileText className="h-4.5 w-4.5 text-primary" />
                Compliance Hardening Checklist
              </h4>
              <p className="text-xs text-muted-foreground leading-normal">
                {complianceData.recommendation}
              </p>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
