import { useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { ArrowLeft, Download, FileText, Loader2 } from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { ScoreRing } from "@/components/ScoreRing";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";
import { toast } from "sonner";

const REPORT_AUDIENCES = [
  { value: "cto", label: "CTO" },
  { value: "engineering_manager", label: "Engineering Manager" },
  { value: "investor", label: "Investor" },
  { value: "product_manager", label: "Product Manager" },
  { value: "architect", label: "Solution Architect" },
];

function ReportMarkdown({ markdown }: { markdown: string }) {
  return (
    <div className="space-y-1.5">
      {markdown.split("\n").map((line, i) => {
        const bold = (s: string) => {
          const parts = s.split(/\*\*(.+?)\*\*/g);
          return parts.map((p, j) => (j % 2 === 1 ? <strong key={j} className="text-foreground">{p}</strong> : p));
        };
        if (line.startsWith("# ")) return <h2 key={i} className="font-display text-base font-semibold pt-1">{line.slice(2)}</h2>;
        if (line.startsWith("## ")) return <h3 key={i} className="font-display text-sm font-semibold pt-2">{line.slice(3)}</h3>;
        if (line.startsWith("### ")) return <h4 key={i} className="text-xs font-semibold pt-1.5">{line.slice(4)}</h4>;
        if (line.startsWith("- ")) return <div key={i} className="text-xs text-muted-foreground pl-3 leading-relaxed">• {bold(line.slice(2))}</div>;
        if (!line.trim()) return null;
        return <p key={i} className="text-xs text-muted-foreground leading-relaxed">{bold(line)}</p>;
      })}
    </div>
  );
}

export default function ExecutiveReport() {
  const { id } = useParams();
  const [audience, setAudience] = useState("cto");

  const { data: analysis, isLoading: analysisLoading } = useQuery({
    queryKey: ["analysis", id],
    queryFn: () => api.getAnalysis(id!),
    enabled: Boolean(id),
  });

  const { data: report, isLoading: reportLoading, error } = useQuery({
    queryKey: ["executive-report", id, audience],
    queryFn: () => api.getExecutiveReport(id!, audience),
    enabled: Boolean(id),
  });

  const downloadMarkdown = () => {
    if (!report) return;
    const blob = new Blob([report.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = `${analysis?.name?.replace(/[^\w.-]+/g, "_") ?? "report"}-${audience}-report.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Report downloaded");
  };

  const exportFormat = (fmt: "pdf" | "html") => {
    if (!id) return;
    api.downloadExport(id, fmt, `${analysis?.name?.replace(/[^\w.-]+/g, "_") ?? "report"}-${audience}-report`)
      .then(() => toast.success(`Downloaded ${fmt.toUpperCase()}`))
      .catch(() => toast.error(`${fmt.toUpperCase()} export failed`));
  };

  if (analysisLoading) {
    return <div className="p-8 text-center text-muted-foreground">Loading analysis…</div>;
  }

  if (!analysis) {
    return (
      <div className="p-8 text-center">
        <p className="text-muted-foreground">Analysis not found.</p>
        <Link to="/analyses" className="text-primary text-sm mt-2 inline-block">Back to analyses</Link>
      </div>
    );
  }

  return (
    <div className="p-6 md:p-8 max-w-4xl mx-auto">
      <Link
        to={`/analyses/${id}`}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back to analysis
      </Link>

      <PageHeader
        title="Executive Report"
        description={`Tailored architecture report for "${analysis.name}"`}
        actions={
          <div className="flex items-center gap-2">
            <Button variant="outline" size="sm" onClick={downloadMarkdown} disabled={!report}>
              <Download className="h-3.5 w-3.5 mr-1.5" /> .md
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportFormat("html")} disabled={!report}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> HTML
            </Button>
            <Button variant="outline" size="sm" onClick={() => exportFormat("pdf")} disabled={!report}>
              <FileText className="h-3.5 w-3.5 mr-1.5" /> PDF
            </Button>
          </div>
        }
      />

      <div className="flex flex-wrap gap-1.5 mb-6">
        {REPORT_AUDIENCES.map((a) => (
          <button
            key={a.value}
            type="button"
            onClick={() => setAudience(a.value)}
            className={cn(
              "text-xs px-3 py-1.5 rounded-md border transition-colors",
              audience === a.value
                ? "border-primary/50 bg-primary/10 text-foreground font-medium"
                : "border-border text-muted-foreground hover:border-primary/30",
            )}
          >
            {a.label}
          </button>
        ))}
      </div>

      {reportLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <Loader2 className="h-5 w-5 animate-spin mx-auto mb-3 text-primary" />
          <p className="text-sm text-muted-foreground">Generating report for {REPORT_AUDIENCES.find((a) => a.value === audience)?.label}…</p>
        </div>
      )}

      {error && !reportLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-danger">Could not load report. Try again.</p>
        </div>
      )}

      {report && !reportLoading && (
        <div className="space-y-4">
          <div className="flex items-center gap-3 flex-wrap">
            <ScoreRing value={report.score} size={64} label="Score" />
            <Badge variant="outline" className="text-sm px-3 py-1">Risk: {report.risk_level}</Badge>
            <Badge variant="outline" className="text-sm px-3 py-1">{report.audience_label}</Badge>
          </div>

          <div className="rounded-xl border border-border bg-card p-5 md:p-6">
            <ReportMarkdown markdown={report.markdown} />
          </div>
        </div>
      )}
    </div>
  );
}
