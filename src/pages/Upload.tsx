import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { PageHeader } from "@/components/PageHeader";
import { UploadCloud, FileImage, X, Sparkles, Loader2 } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";
import { api, ApiError } from "@/lib/api";

const MAX_BYTES = 25 * 1024 * 1024;
const ACCEPT = ".png,.jpg,.jpeg,.pdf,.drawio,.excalidraw,.mmd,.puml,.svg,.json,.tf,.yaml,.yml,.sql";

export default function Upload() {
  const navigate = useNavigate();
  const queryClient = useQueryClient();
  const [tab, setTab] = useState("upload");
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);
  const [name, setName] = useState("Untitled architecture");
  const [pasteContent, setPasteContent] = useState("");
  const [url, setUrl] = useState("");

  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.listWorkspaces(),
  });
  const [workspaceId, setWorkspaceId] = useState<string | undefined>();

  const createMutation = useMutation({
    mutationFn: async () => {
      const ws = workspaceId || workspaces[0]?.id;
      if (tab === "upload") {
        if (!files.length) throw new Error("Choose at least one file");
        const form = new FormData();
        form.append("file", files[0]);
        form.append("name", name);
        if (ws) form.append("workspace_id", ws);
        return api.uploadAnalysis(form);
      }
      if (tab === "paste") {
        if (!pasteContent.trim()) throw new Error("Paste diagram code first");
        return api.createAnalysis({
          name,
          workspace_id: ws,
          source_type: "paste",
          source_content: pasteContent,
        });
      }
      if (!url.trim()) throw new Error("Enter a diagram URL");
      return api.createAnalysis({
        name,
        workspace_id: ws,
        source_type: "url",
        source_content: url,
      });
    },
    onSuccess: (analysis) => {
      queryClient.invalidateQueries({ queryKey: ["analyses"] });
      queryClient.invalidateQueries({ queryKey: ["dashboard-stats"] });
      toast.success("Analysis started", { description: "Agents are reviewing your diagram." });
      navigate(`/analyses/${analysis.id}`);
    },
    onError: (err) => {
      toast.error(err instanceof ApiError ? err.message : err instanceof Error ? err.message : "Failed to start analysis");
    },
  });

  const addFiles = useCallback((incoming: File[]) => {
    const valid = incoming.filter((f) => {
      if (f.size > MAX_BYTES) {
        toast.error(`${f.name} exceeds 25 MB`);
        return false;
      }
      return true;
    });
    setFiles((prev) => {
      const keys = new Set(prev.map((f) => `${f.name}-${f.size}`));
      return [...prev, ...valid.filter((f) => !keys.has(`${f.name}-${f.size}`))];
    });
  }, []);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    addFiles(Array.from(e.dataTransfer.files));
  }, [addFiles]);

  const canStart =
    (tab === "upload" && files.length > 0) ||
    (tab === "paste" && pasteContent.trim().length > 0) ||
    (tab === "url" && url.trim().length > 0);

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="New analysis"
        description="Upload an architecture diagram, paste a diagram-as-code snippet, or import from a URL."
      />

      <Tabs value={tab} onValueChange={setTab} className="w-full">
        <TabsList className="bg-muted/40">
          <TabsTrigger value="upload">Upload</TabsTrigger>
          <TabsTrigger value="paste">Paste code</TabsTrigger>
          <TabsTrigger value="url">From URL</TabsTrigger>
        </TabsList>

        <TabsContent value="upload" className="mt-5">
          <div
            onDragOver={(e) => { e.preventDefault(); setDrag(true); }}
            onDragLeave={() => setDrag(false)}
            onDrop={onDrop}
            className={cn(
              "relative rounded-2xl border-2 border-dashed p-6 md:p-12 text-center transition-all",
              drag ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:bg-card"
            )}
          >
            <div className="mx-auto h-10 w-10 md:h-14 md:w-14 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <UploadCloud className="h-5 w-5 md:h-7 md:w-7 text-primary-foreground" />
            </div>
            <h3 className="mt-4 md:mt-5 font-display text-base md:text-xl font-semibold">Drop your architecture or config file here</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              PNG, JPG, Draw.io, Excalidraw, Mermaid, Terraform (.tf), Kubernetes/Docker Compose (.yaml), OpenAPI (.json/.yaml), SQL Schema (.sql)
            </p>
            <div className="mt-5">
              <input
                id="files" type="file" className="hidden"
                onChange={(e) => addFiles(Array.from(e.target.files ?? []))}
                accept={ACCEPT}
              />
              <Label htmlFor="files">
                <Button variant="outline" asChild><span>Choose files</span></Button>
              </Label>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Max 25 MB per file</div>
          </div>

          {files.length > 0 && (
            <div className="mt-5 space-y-2">
              {files.map((f) => (
                <div key={`${f.name}-${f.size}-${f.lastModified}`} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <FileImage className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFiles((p) => p.filter((x) => x !== f))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="mt-5">
          <Textarea
            value={pasteContent}
            onChange={(e) => setPasteContent(e.target.value)}
            placeholder={`graph TD\n  A[Client] --> B[API Gateway]\n  B --> C[Service]\n  C --> D[(Database)]`}
            className="font-mono text-sm min-h-[280px] bg-card"
          />
        </TabsContent>

        <TabsContent value="url" className="mt-5">
          <div className="space-y-2">
            <Label>Diagram URL</Label>
            <Input value={url} onChange={(e) => setUrl(e.target.value)} placeholder="https://lucid.app/lucidchart/..." />
            <p className="text-xs text-muted-foreground">Works with Lucidchart, Figma share links, and public Draw.io URLs.</p>
          </div>
        </TabsContent>
      </Tabs>

      <div className="mt-8 rounded-xl border border-border bg-card p-5">
        <div className="flex items-center gap-2 mb-3">
          <Sparkles className="h-4 w-4 text-primary" />
          <div className="font-medium">Analysis preferences</div>
        </div>
        <div className="grid sm:grid-cols-2 gap-4">
          <div className="space-y-1.5">
            <Label>Analysis name</Label>
            <Input value={name} onChange={(e) => setName(e.target.value)} />
          </div>
          <div className="space-y-1.5">
            <Label>Workspace</Label>
            <Input
              value={workspaces.find((w) => w.id === (workspaceId ?? workspaces[0]?.id))?.name ?? "Personal"}
              readOnly
              className="bg-muted/30"
            />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button
          disabled={!canStart || createMutation.isPending}
          onClick={() => createMutation.mutate()}
          className="bg-gradient-primary text-primary-foreground hover:opacity-90"
        >
          {createMutation.isPending ? <><Loader2 className="h-4 w-4 mr-1.5 animate-spin" /> Starting…</> : "Start analysis"}
        </Button>
      </div>
    </div>
  );
}
