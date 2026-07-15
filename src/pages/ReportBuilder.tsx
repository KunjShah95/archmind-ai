import { useState } from "react";
import { useParams, useNavigate } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import {
  ArrowLeft, Loader2, FileDown, BarChart3, MessageSquare, AlertTriangle,
  FileText, Map, Check, Eye,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Label } from "@/components/ui/label";
import { Checkbox } from "@/components/ui/checkbox";
import {
  Select, SelectContent, SelectItem, SelectTrigger, SelectValue,
} from "@/components/ui/select";
import { toast } from "sonner";
import { api } from "@/lib/api";
import { AGENTS, overallScore, scoreColor, SEVERITY_META } from "@/lib/types";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";

type Section = { id: string; label: string; icon: typeof BarChart3; description: string };

const SECTIONS: Section[] = [
  { id: "scores", label: "Score Summary", icon: BarChart3, description: "Overall and per-agent architecture scores" },
  { id: "diagram", label: "Architecture Diagram", icon: Map, description: "Visual system topology" },
  { id: "findings", label: "Findings", icon: AlertTriangle, description: "Issues and recommendations by agent" },
  { id: "debate", label: "AI Debate Summary", icon: MessageSquare, description: "Multi-agent mediator synthesis" },
  { id: "executive", label: "Executive Summary", icon: FileText, description: "High-level risk and recommendation narrative" },
];

const AUDIENCES = [
  { value: "executive", label: "Executive / C-Suite" },
  { value: "engineering", label: "Engineering Team" },
  { value: "security", label: "Security & Compliance" },
  { value: "investor", label: "Investor / Board" },
];

const SEVERITIES = ["critical", "high", "medium", "low"] as const;

export default function ReportBuilder() {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();

  const [selectedSections, setSelectedSections] = useState<Set<string>>(
    new Set(["scores", "findings", "executive"])
  );
  const [audience, setAudience] = useState("engineering");
  const [severityFilter, setSeverityFilter] = useState<Set<string>>(new Set(SEVERITIES));
  const [exporting, setExporting] = useState(false);
  const [preview, setPreview] = useState(false);

  const { data: analysis, isLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
  });

  const toggleSection = (sectionId: string) => {
    setSelectedSections((prev) => {
      const next = new Set(prev);
      if (next.has(sectionId)) next.delete(sectionId);
      else next.add(sectionId);
      return next;
    });
  };

  const toggleSeverity = (sev: string) => {
    setSeverityFilter((prev) => {
      const next = new Set(prev);
      if (next.has(sev)) next.delete(sev);
      else next.add(sev);
      return next;
    });
  };

  const handleExport = async () => {
    if (!id) return;
    setExporting(true);
    try {
      await api.downloadExport(id, "pdf", `${analysis?.name ?? "report"}-custom`);
      toast.success("Report exported");
    } catch (e) {
      toast.error(e instanceof Error ? e.message : "Export failed");
    } finally {
      setExporting(false);
    }
  };

  const filteredFindings = (analysis?.findings ?? []).filter((f) =>
    severityFilter.has(f.severity)
  );
  const overall = analysis ? overallScore(analysis.scores) : 0;

  if (isLoading) {
    return (
      <div className="flex items-center justify-center h-64">
        <Loader2 className="h-6 w-6 animate-spin text-muted-foreground" />
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-6">
      <div className="flex items-center gap-3">
        <Button variant="ghost" size="icon" onClick={() => navigate(`/analyses/${id}`)}>
          <ArrowLeft className="h-4 w-4" />
        </Button>
        <PageHeader
          title="Report Builder"
          description={analysis?.name ?? "Customize and export your architecture report"}
          actions={
            <div className="flex gap-2">
              <Button variant="outline" size="sm" onClick={() => setPreview(!preview)}>
                <Eye className="h-3.5 w-3.5 mr-1.5" /> {preview ? "Edit" : "Preview"}
              </Button>
              <button
                className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed"
                style={{ background: "hsl(16 76% 52%)" }}
                onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
                onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
                onClick={handleExport}
                disabled={exporting || selectedSections.size === 0}
              >
                {exporting ? <Loader2 className="h-3.5 w-3.5 animate-spin mr-1.5" /> : <FileDown className="h-3.5 w-3.5 mr-1.5" />}
                Export PDF
              </button>
            </div>
          }
        />
      </div>

      <div className="grid lg:grid-cols-3 gap-6">
        <div className="lg:col-span-1 space-y-4">
          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm">Report Sections</h3>
            <div className="space-y-3">
              {SECTIONS.map((s) => {
                const Icon = s.icon;
                const checked = selectedSections.has(s.id);
                return (
                  <label key={s.id} className="flex items-start gap-3 cursor-pointer group">
                    <Checkbox
                      checked={checked}
                      onCheckedChange={() => toggleSection(s.id)}
                      className="mt-0.5"
                    />
                    <div className="min-w-0">
                      <div className="flex items-center gap-1.5 text-sm font-medium group-hover:text-primary transition-colors">
                        <Icon className="h-3.5 w-3.5 text-muted-foreground" />
                        {s.label}
                        {checked && <Check className="h-3 w-3 text-green-400 ml-auto" />}
                      </div>
                      <div className="text-xs text-muted-foreground">{s.description}</div>
                    </div>
                  </label>
                );
              })}
            </div>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm">Target Audience</h3>
            <Select value={audience} onValueChange={setAudience}>
              <SelectTrigger>
                <SelectValue />
              </SelectTrigger>
              <SelectContent>
                {AUDIENCES.map((a) => (
                  <SelectItem key={a.value} value={a.value}>{a.label}</SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 space-y-4">
            <h3 className="font-display font-semibold text-sm">Severity Filter</h3>
            <div className="space-y-2">
              {SEVERITIES.map((sev) => {
                const meta = SEVERITY_META[sev];
                const count = (analysis?.findings ?? []).filter((f) => f.severity === sev).length;
                return (
                  <label key={sev} className="flex items-center gap-2.5 cursor-pointer">
                    <Checkbox
                      checked={severityFilter.has(sev)}
                      onCheckedChange={() => toggleSeverity(sev)}
                    />
                    <Badge className={cn("text-xs border-0 capitalize", meta?.bg, meta?.text)}>{sev}</Badge>
                    <span className="text-xs text-muted-foreground ml-auto">{count}</span>
                  </label>
                );
              })}
            </div>
          </div>
        </div>

        <div className="lg:col-span-2">
          <div className="rounded-xl border border-border bg-card overflow-hidden min-h-[500px]">
            <div className="p-4 border-b border-border flex items-center justify-between">
              <span className="text-sm font-medium">Preview</span>
              <Badge variant="secondary">{selectedSections.size} sections · {AUDIENCES.find(a => a.value === audience)?.label}</Badge>
            </div>
            <div className="p-6 space-y-8">
              {selectedSections.has("scores") && analysis && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-4">Architecture Scores</h2>
                  <div className="flex items-center gap-6 mb-4">
                    <div className="text-center">
                      <div className={cn("text-4xl font-display font-bold", scoreColor(overall))}>{overall}</div>
                      <div className="text-xs text-muted-foreground">Overall</div>
                    </div>
                    <div className="flex-1 grid grid-cols-2 gap-3">
                      {AGENTS.map((agent) => {
                        const score = analysis.scores[agent.key] ?? 0;
                        return (
                          <div key={agent.key} className="flex items-center gap-2">
                            <ScoreRing score={score} size={32} stroke={3} />
                            <div className="text-xs text-muted-foreground truncate">{agent.name}</div>
                          </div>
                        );
                      })}
                    </div>
                  </div>
                </section>
              )}

              {selectedSections.has("findings") && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-4">
                    Findings{" "}
                    <span className="text-base font-normal text-muted-foreground">({filteredFindings.length})</span>
                  </h2>
                  {filteredFindings.length === 0 ? (
                    <p className="text-sm text-muted-foreground">No findings match the selected severity filters.</p>
                  ) : (
                    <div className="space-y-3">
                      {filteredFindings.slice(0, 5).map((f) => {
                        const sev = SEVERITY_META[f.severity as keyof typeof SEVERITY_META];
                        return (
                          <div key={f.id} className="rounded-lg border border-border p-3 space-y-1">
                            <div className="flex items-center gap-2">
                              <Badge className={cn("text-xs border-0 capitalize", sev?.color)}>{f.severity}</Badge>
                              <span className="text-sm font-medium">{f.title}</span>
                            </div>
                            <p className="text-xs text-muted-foreground">{f.summary}</p>
                          </div>
                        );
                      })}
                      {filteredFindings.length > 5 && (
                        <p className="text-xs text-muted-foreground">
                          + {filteredFindings.length - 5} more findings in full report
                        </p>
                      )}
                    </div>
                  )}
                </section>
              )}

              {selectedSections.has("executive") && (
                <section>
                  <h2 className="font-display font-bold text-lg mb-3">Executive Summary</h2>
                  <p className="text-sm text-muted-foreground leading-relaxed">
                    This architecture analysis reveals an overall health score of <strong className={cn(scoreColor(overall))}>{overall}/100</strong>.{" "}
                    {overall >= 70
                      ? "The system demonstrates solid architectural principles with areas for optimization."
                      : overall >= 50
                      ? "The architecture requires targeted improvements to meet production-grade standards."
                      : "Significant architectural concerns identified — immediate remediation recommended."}
                    {" "}
                    {filteredFindings.filter(f => f.severity === "critical").length > 0 && (
                      <>There are <strong>{filteredFindings.filter(f => f.severity === "critical").length} critical findings</strong> requiring immediate attention.</>
                    )}
                  </p>
                </section>
              )}

              {!preview && selectedSections.size === 0 && (
                <div className="flex flex-col items-center justify-center py-16 text-muted-foreground gap-3">
                  <FileText className="h-8 w-8 opacity-30" />
                  <p className="text-sm">Select sections to preview your report</p>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
