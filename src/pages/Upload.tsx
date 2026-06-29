import { useCallback, useState } from "react";
import { useNavigate } from "react-router-dom";
import { PageHeader } from "@/components/PageHeader";
import { UploadCloud, FileImage, X, Sparkles } from "lucide-react";
import { Button } from "@/components/ui/button";
import { Textarea } from "@/components/ui/textarea";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

export default function Upload() {
  const navigate = useNavigate();
  const [files, setFiles] = useState<File[]>([]);
  const [drag, setDrag] = useState(false);

  const onDrop = useCallback((e: React.DragEvent) => {
    e.preventDefault();
    setDrag(false);
    const f = Array.from(e.dataTransfer.files);
    setFiles((prev) => [...prev, ...f]);
  }, []);

  const startAnalysis = () => {
    // TODO: POST to /api/analyses on FastAPI backend
    toast.success("Analysis started", { description: "Agents are reviewing your diagram." });
    setTimeout(() => navigate("/analyses/an_01"), 600);
  };

  return (
    <div className="p-6 md:p-8 max-w-5xl mx-auto">
      <PageHeader
        title="New analysis"
        description="Upload an architecture diagram, paste a diagram-as-code snippet, or import from a URL."
      />

      <Tabs defaultValue="upload" className="w-full">
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
              "relative rounded-2xl border-2 border-dashed p-12 text-center transition-all",
              drag ? "border-primary bg-primary/5" : "border-border bg-card/40 hover:bg-card"
            )}
          >
            <div className="mx-auto h-14 w-14 rounded-xl bg-gradient-primary grid place-items-center shadow-glow">
              <UploadCloud className="h-7 w-7 text-primary-foreground" />
            </div>
            <h3 className="mt-5 font-display text-xl font-semibold">Drop your diagram here</h3>
            <p className="mt-1 text-sm text-muted-foreground">
              PNG, JPG, PDF, Draw.io, Excalidraw, Mermaid, PlantUML, Lucidchart, Figma export
            </p>
            <div className="mt-5">
              <input
                id="files" type="file" multiple className="hidden"
                onChange={(e) => setFiles((p) => [...p, ...Array.from(e.target.files ?? [])])}
                accept=".png,.jpg,.jpeg,.pdf,.drawio,.excalidraw,.mmd,.puml,.svg,.json"
              />
              <Label htmlFor="files">
                <Button variant="outline" asChild><span>Choose files</span></Button>
              </Label>
            </div>
            <div className="mt-4 text-xs text-muted-foreground">Max 25 MB per file</div>
          </div>

          {files.length > 0 && (
            <div className="mt-5 space-y-2">
              {files.map((f, i) => (
                <div key={i} className="flex items-center gap-3 rounded-lg border border-border bg-card px-3 py-2.5">
                  <FileImage className="h-4 w-4 text-primary" />
                  <div className="min-w-0 flex-1">
                    <div className="text-sm font-medium truncate">{f.name}</div>
                    <div className="text-xs text-muted-foreground">{(f.size / 1024).toFixed(1)} KB</div>
                  </div>
                  <Button variant="ghost" size="icon" className="h-7 w-7" onClick={() => setFiles((p) => p.filter((_, j) => j !== i))}>
                    <X className="h-3.5 w-3.5" />
                  </Button>
                </div>
              ))}
            </div>
          )}
        </TabsContent>

        <TabsContent value="paste" className="mt-5">
          <Textarea
            placeholder={`graph TD\n  A[Client] --> B[API Gateway]\n  B --> C[Service]\n  C --> D[(Database)]`}
            className="font-mono text-sm min-h-[280px] bg-card"
          />
        </TabsContent>

        <TabsContent value="url" className="mt-5">
          <div className="space-y-2">
            <Label>Diagram URL</Label>
            <Input placeholder="https://lucid.app/lucidchart/..." />
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
            <Input defaultValue="Untitled architecture" />
          </div>
          <div className="space-y-1.5">
            <Label>Workspace</Label>
            <Input defaultValue="Platform" />
          </div>
        </div>
      </div>

      <div className="mt-6 flex justify-end gap-2">
        <Button variant="outline" onClick={() => navigate(-1)}>Cancel</Button>
        <Button onClick={startAnalysis} className="bg-gradient-primary text-primary-foreground hover:opacity-90">
          Start analysis
        </Button>
      </div>
    </div>
  );
}
