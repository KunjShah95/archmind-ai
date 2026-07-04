import { useCallback, useMemo, useState } from "react";
import { Link, useParams } from "react-router-dom";
import { useQuery } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Badge } from "@/components/ui/badge";
import { ArrowLeft, Copy, Download, FileText, Loader2 } from "lucide-react";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api } from "@/lib/api";

const DOC_TYPES = [
  { value: "readme", label: "README", description: "Project overview and setup instructions" },
  { value: "adr", label: "Architecture Decision Record", description: "Design rationale and trade-offs" },
  { value: "deployment-guide", label: "Deployment Guide", description: "Deployment steps and infrastructure" },
  { value: "runbook", label: "Runbook", description: "Operational procedures and runbooks" },
] as const;

function boldText(s: string) {
  const parts = s.split(/\*\*(.+?)\*\*/g);
  return parts.map((p, j) =>
    j % 2 === 1 ? <strong key={j} className="text-foreground font-semibold">{p}</strong> : p,
  );
}

function MarkdownPreview({ markdown }: { markdown: string }) {
  const blocks = useMemo(() => {
    const lines = markdown.split("\n");
    const result: React.ReactNode[] = [];
    let inCode = false;
    let codeContent: string[] = [];
    let codeKey = 0;

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      const trimmed = line.trim();

      if (/^```/.test(trimmed)) {
        if (inCode) {
          result.push(
            <pre key={`code-${codeKey++}`} className="rounded-lg bg-muted p-4 overflow-x-auto my-3 text-sm leading-relaxed">
              <code>{codeContent.join("\n")}</code>
            </pre>,
          );
          codeContent = [];
          inCode = false;
        } else {
          inCode = true;
        }
        continue;
      }

      if (inCode) {
        codeContent.push(line);
        continue;
      }

      if (line.startsWith("# ")) {
        result.push(<h1 key={i} className="font-display text-xl font-semibold tracking-tight pt-2 first:pt-0">{boldText(line.slice(2))}</h1>);
      } else if (line.startsWith("## ")) {
        result.push(<h2 key={i} className="font-display text-lg font-semibold tracking-tight pt-3">{boldText(line.slice(3))}</h2>);
      } else if (line.startsWith("### ")) {
        result.push(<h3 key={i} className="font-display text-base font-semibold pt-2">{boldText(line.slice(4))}</h3>);
      } else if (line.startsWith("#### ")) {
        result.push(<h4 key={i} className="font-display text-sm font-semibold pt-1.5 text-muted-foreground">{boldText(line.slice(5))}</h4>);
      } else if (line.startsWith("- ")) {
        result.push(
          <div key={i} className="flex gap-2 pl-4 text-sm leading-relaxed">
            <span className="text-primary shrink-0 mt-0.5 select-none">•</span>
            <span className="text-muted-foreground">{boldText(line.slice(2))}</span>
          </div>,
        );
      } else if (line.startsWith("> ")) {
        result.push(
          <blockquote key={i} className="border-l-2 border-primary/30 pl-4 py-1 my-2 text-sm text-muted-foreground italic">
            {boldText(line.slice(2))}
          </blockquote>,
        );
      } else if (trimmed === "") {
        result.push(<div key={i} className="h-2" />);
      } else {
        result.push(<p key={i} className="text-sm text-muted-foreground leading-relaxed">{boldText(line)}</p>);
      }
    }

    if (inCode && codeContent.length > 0) {
      result.push(
        <pre key={`code-${codeKey}`} className="rounded-lg bg-muted p-4 overflow-x-auto my-3 text-sm leading-relaxed">
          <code>{codeContent.join("\n")}</code>
        </pre>,
      );
    }

    return result;
  }, [markdown]);

  return <div className="space-y-0.5">{blocks}</div>;
}

export default function DocsGenerator() {
  const { id } = useParams();
  const [selectedAnalysisId, setSelectedAnalysisId] = useState(id ?? "");
  const [docType, setDocType] = useState<string>("readme");
  const [shouldGenerate, setShouldGenerate] = useState(false);

  const { data: analyses = [], isLoading: analysesLoading } = useQuery({
    queryKey: ["analyses"],
    queryFn: () => api.listAnalyses(),
  });

  const { data: analysis } = useQuery({
    queryKey: ["analysis", selectedAnalysisId],
    queryFn: () => api.getAnalysis(selectedAnalysisId),
    enabled: Boolean(selectedAnalysisId),
  });

  const ready = analysis?.status === "ready";

  const {
    data: doc,
    isLoading: docLoading,
    error: docError,
  } = useQuery({
    queryKey: ["generated-doc", selectedAnalysisId, docType],
    queryFn: () => api.getGeneratedDoc(selectedAnalysisId, docType as "readme" | "adr"),
    enabled: shouldGenerate && ready,
  });

  const handleCopy = useCallback(async () => {
    if (!doc?.markdown) return;
    try {
      await navigator.clipboard.writeText(doc.markdown);
      toast.success("Copied to clipboard");
    } catch {
      toast.error("Failed to copy");
    }
  }, [doc]);

  const handleDownload = useCallback(() => {
    if (!doc?.markdown) return;
    const blob = new Blob([doc.markdown], { type: "text/markdown" });
    const url = URL.createObjectURL(blob);
    const a = document.createElement("a");
    a.href = url;
    a.download = doc.filename ?? `${selectedAnalysisId}-${docType}.md`;
    a.click();
    URL.revokeObjectURL(url);
    toast.success("Downloaded");
  }, [doc, selectedAnalysisId, docType]);

  const currentDocType = DOC_TYPES.find((t) => t.value === docType);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <Link
        to={id ? `/analyses/${id}` : "/analyses"}
        className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4"
      >
        <ArrowLeft className="h-3.5 w-3.5" /> Back
      </Link>

      <PageHeader
        title="Docs Generator"
        description="Generate architecture documentation from your analysis."
      />

      <div className="rounded-xl border border-border bg-card p-5 mb-6">
        <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <label className="text-sm font-medium">Analysis</label>
            <Select
              value={selectedAnalysisId}
              onValueChange={(v) => { setSelectedAnalysisId(v); setShouldGenerate(false); }}
            >
              <SelectTrigger>
                <SelectValue placeholder="Select an analysis..." />
              </SelectTrigger>
              <SelectContent>
                {analyses.map((a) => (
                  <SelectItem key={a.id} value={a.id}>
                    {a.name}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>

          <div className="space-y-1.5">
            <label className="text-sm font-medium">Document type</label>
            <Select value={docType} onValueChange={(v) => { setDocType(v); setShouldGenerate(false); }}>
              <SelectTrigger>
                <SelectValue placeholder="Select type..." />
              </SelectTrigger>
              <SelectContent>
                {DOC_TYPES.map((t) => (
                  <SelectItem key={t.value} value={t.value}>
                    <div>
                      <div>{t.label}</div>
                      <div className="text-[11px] text-muted-foreground">{t.description}</div>
                    </div>
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        </div>

        <button
          className="inline-flex items-center gap-1.5 rounded-md px-4 py-2 text-sm font-semibold text-white transition-all disabled:opacity-50 disabled:cursor-not-allowed mt-4"
          disabled={!selectedAnalysisId || !ready}
          onClick={() => setShouldGenerate(true)}
          style={{ background: "hsl(16 76% 52%)" }}
          onMouseEnter={(e) => { e.currentTarget.style.transform = "translateY(-1px)"; e.currentTarget.style.boxShadow = "0 4px 14px hsl(16 76% 52% / 0.35)"; }}
          onMouseLeave={(e) => { e.currentTarget.style.transform = ""; e.currentTarget.style.boxShadow = ""; }}
        >
          <FileText className="h-4 w-4 mr-1.5" /> Generate
        </button>
      </div>

      {analysis && !ready && (
        <div className="rounded-xl border border-border bg-card p-8 text-center">
          <p className="text-sm text-muted-foreground mb-2">Analysis must be completed before generating docs.</p>
          <Badge variant="outline">{analysis.status}</Badge>
        </div>
      )}

      {docLoading && (
        <div className="rounded-xl border border-border bg-card p-16 text-center">
          <Loader2 className="h-6 w-6 animate-spin text-primary mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Generating {currentDocType?.label ?? docType}…
          </p>
        </div>
      )}

      {docError && !docLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <p className="text-sm text-destructive mb-1">Failed to generate document.</p>
          <p className="text-xs text-muted-foreground">
            {docType === "deployment-guide" || docType === "runbook"
              ? "Deployment Guide and Runbook generation will be available soon."
              : "Try again or select a different document type."}
          </p>
        </div>
      )}

      {doc && !docLoading && (
        <div className="rounded-xl border border-border bg-card overflow-hidden">
          <div className={cn(
            "flex items-center justify-between px-5 py-3 border-b border-border",
            "max-sm:flex-col max-sm:items-start max-sm:gap-2",
          )}>
            <div className="flex items-center gap-2">
              <FileText className="h-4 w-4 text-primary shrink-0" />
              <span className="text-sm font-medium">{doc.filename}</span>
              {currentDocType && (
                <Badge variant="outline" className="text-[10px] font-normal">
                  {currentDocType.label}
                </Badge>
              )}
            </div>
            <div className="flex items-center gap-1.5">
              <Button variant="outline" size="sm" onClick={handleCopy}>
                <Copy className="h-3.5 w-3.5 mr-1" /> Copy
              </Button>
              <Button variant="outline" size="sm" onClick={handleDownload}>
                <Download className="h-3.5 w-3.5 mr-1" /> .md
              </Button>
            </div>
          </div>
          <div className="p-5 max-h-[70vh] overflow-y-auto">
            <MarkdownPreview markdown={doc.markdown} />
          </div>
        </div>
      )}

      {!analysis && !analysesLoading && !doc && !docLoading && (
        <div className="rounded-xl border border-border bg-card p-12 text-center">
          <FileText className="h-10 w-10 text-muted-foreground mx-auto mb-3" />
          <p className="text-sm text-muted-foreground">
            Select an analysis and document type, then click Generate.
          </p>
        </div>
      )}
    </div>
  );
}
