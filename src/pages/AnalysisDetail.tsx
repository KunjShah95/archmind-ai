import { useState } from "react";
import { useParams, Link } from "react-router-dom";
import ReactFlow, { Background, Controls, MarkerType, MiniMap } from "reactflow";
import { motion } from "framer-motion";
import {
  Download, MessageSquareText, Share2, Sparkles, Send, ArrowLeft,
  TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity, Check, AlertTriangle,
} from "lucide-react";
import { Button } from "@/components/ui/button";
import { Badge } from "@/components/ui/badge";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@/components/ui/tabs";
import { ScoreRing } from "@/components/ScoreRing";
import { AGENTS, AgentKey, MOCK_ANALYSES, MOCK_FINDINGS, SEVERITY_META, overallScore, scoreColor } from "@/lib/mock-data";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { cn } from "@/lib/utils";

const ICONS: Record<string, any> = { TrendingUp, ShieldCheck, HeartPulse, Gauge, DollarSign, Wrench, Activity };

const NODES = [
  { id: "n-client", position: { x: 20, y: 60 }, data: { label: "Client" } },
  { id: "n-cdn", position: { x: 220, y: 60 }, data: { label: "CDN" } },
  { id: "n-api", position: { x: 420, y: 60 }, data: { label: "API Gateway" } },
  { id: "n-auth", position: { x: 220, y: 200 }, data: { label: "Auth Service" } },
  { id: "n-orders", position: { x: 420, y: 200 }, data: { label: "Order Service" } },
  { id: "n-workers", position: { x: 620, y: 200 }, data: { label: "Workers" } },
  { id: "n-db", position: { x: 420, y: 340 }, data: { label: "Postgres HA" } },
  { id: "n-cache", position: { x: 620, y: 340 }, data: { label: "Redis" } },
];

const EDGES = [
  ["n-client", "n-cdn"], ["n-cdn", "n-api"], ["n-api", "n-auth"], ["n-api", "n-orders"],
  ["n-orders", "n-workers"], ["n-orders", "n-db"], ["n-workers", "n-cache"], ["n-orders", "n-cache"],
].map(([s, t], i) => ({
  id: `e${i}`, source: s, target: t, animated: true,
  style: { stroke: "hsl(var(--primary) / 0.6)", strokeWidth: 1.6 },
  markerEnd: { type: MarkerType.ArrowClosed, color: "hsl(var(--primary))" },
}));

export default function AnalysisDetail() {
  const { id } = useParams();
  const a = MOCK_ANALYSES.find((x) => x.id === id) ?? MOCK_ANALYSES[0];
  const [activeAgent, setActiveAgent] = useState<AgentKey | "all">("all");
  const [selectedNode, setSelectedNode] = useState<string | null>(null);

  const nodes = NODES.map((n) => ({
    ...n,
    type: "default",
    style: {
      border: `1px solid ${selectedNode === n.id ? "hsl(var(--primary))" : "hsl(var(--border))"}`,
      background: "hsl(var(--card))",
      color: "hsl(var(--foreground))",
      borderRadius: 10,
      padding: 10,
      fontSize: 12,
      fontWeight: 500,
      width: 150,
      boxShadow: selectedNode === n.id ? "0 0 0 4px hsl(var(--primary) / 0.2)" : undefined,
    },
  }));

  const findings = MOCK_FINDINGS.filter((f) => activeAgent === "all" || f.agent === activeAgent);
  const overall = overallScore(a.scores);

  return (
    <div className="p-6 md:p-8 max-w-[1600px] mx-auto">
      <Link to="/analyses" className="inline-flex items-center gap-1.5 text-sm text-muted-foreground hover:text-foreground mb-4">
        <ArrowLeft className="h-3.5 w-3.5" /> Back to analyses
      </Link>

      <div className="flex flex-wrap items-start justify-between gap-4 mb-6">
        <div className="min-w-0">
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="font-display text-2xl md:text-3xl font-semibold tracking-tight">{a.name}</h1>
            <Badge variant="outline" className="font-normal">{a.type}</Badge>
            <Badge className="bg-success/10 text-success border-success/20 hover:bg-success/10">Ready</Badge>
          </div>
          <p className="mt-1 text-sm text-muted-foreground">{a.workspace} · {a.author} · {new Date(a.uploadedAt).toLocaleString()}</p>
        </div>
        <div className="flex items-center gap-2">
          <Button variant="outline" size="sm"><Share2 className="h-3.5 w-3.5 mr-1.5" /> Share</Button>
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <Button variant="outline" size="sm"><Download className="h-3.5 w-3.5 mr-1.5" /> Export</Button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="end">
              {["PDF report", "Markdown", "HTML", "JSON"].map((f) => (
                <DropdownMenuItem key={f} onClick={() => toast.success(`Exporting ${f}…`)}>{f}</DropdownMenuItem>
              ))}
            </DropdownMenuContent>
          </DropdownMenu>
          <Button size="sm" className="bg-gradient-primary text-primary-foreground hover:opacity-90">
            <Sparkles className="h-3.5 w-3.5 mr-1.5" /> Re-run
          </Button>
        </div>
      </div>

      <div className="grid grid-cols-2 md:grid-cols-4 lg:grid-cols-8 gap-3 mb-6">
        <div className="rounded-xl border border-border bg-card p-4 col-span-2 md:col-span-1 flex flex-col items-center justify-center">
          <ScoreRing value={overall} size={84} label="Overall" />
        </div>
        {AGENTS.map((a2) => {
          const Icon = ICONS[a2.icon];
          const s = a.scores[a2.key];
          return (
            <button
              key={a2.key}
              onClick={() => setActiveAgent(activeAgent === a2.key ? "all" : a2.key)}
              className={cn(
                "rounded-xl border bg-card p-3 text-left transition-all hover:-translate-y-0.5",
                activeAgent === a2.key ? "border-primary shadow-glow" : "border-border"
              )}
            >
              <div className="flex items-center justify-between">
                <div className={`h-7 w-7 rounded-md bg-gradient-to-br ${a2.accent} grid place-items-center`}>
                  <Icon className="h-3.5 w-3.5 text-white" />
                </div>
                <div className={cn("text-lg font-display font-semibold", scoreColor(s))}>{s}</div>
              </div>
              <div className="mt-2 text-[11px] font-medium truncate">{a2.name.replace(" Agent", "")}</div>
            </button>
          );
        })}
      </div>

      <div className="grid grid-cols-12 gap-4">
        <div className="col-span-12 lg:col-span-8 rounded-xl border border-border bg-card overflow-hidden">
          <div className="flex items-center justify-between px-4 py-2.5 border-b border-border">
            <div className="text-sm font-medium">Interactive viewer</div>
            <div className="text-xs text-muted-foreground">Click a node to filter findings</div>
          </div>
          <div className="h-[520px]">
            <ReactFlow
              nodes={nodes}
              edges={EDGES}
              fitView
              onNodeClick={(_, n) => setSelectedNode(n.id)}
              proOptions={{ hideAttribution: true }}
              nodesDraggable={false}
            >
              <Background gap={20} size={1} color="hsl(var(--border))" />
              <Controls className="!bg-card !border-border" />
              <MiniMap className="!bg-card !border-border" maskColor="hsl(var(--background) / 0.7)" />
            </ReactFlow>
          </div>
        </div>

        <div className="col-span-12 lg:col-span-4 rounded-xl border border-border bg-card overflow-hidden flex flex-col">
          <Tabs defaultValue="findings" className="flex-1 flex flex-col">
            <TabsList className="m-3">
              <TabsTrigger value="findings">Findings</TabsTrigger>
              <TabsTrigger value="timeline">Timeline</TabsTrigger>
              <TabsTrigger value="chat">Chat</TabsTrigger>
            </TabsList>
            <TabsContent value="findings" className="flex-1 m-0 overflow-y-auto scrollbar-thin px-3 pb-3 space-y-2">
              {findings.map((f) => {
                const agent = AGENTS.find((a) => a.key === f.agent)!;
                const Icon = ICONS[agent.icon];
                return (
                  <motion.div
                    key={f.id}
                    initial={{ opacity: 0, y: 6 }}
                    animate={{ opacity: 1, y: 0 }}
                    className="rounded-lg border border-border bg-background/40 p-3 hover:border-primary/40 transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-1.5">
                      <div className={`h-5 w-5 rounded bg-gradient-to-br ${agent.accent} grid place-items-center`}>
                        <Icon className="h-3 w-3 text-white" />
                      </div>
                      <span className="text-[10px] uppercase tracking-wider text-muted-foreground">{agent.name.replace(" Agent","")}</span>
                      <span className={`ml-auto text-[10px] px-1.5 py-0.5 rounded ${SEVERITY_META[f.severity].color}`}>
                        {SEVERITY_META[f.severity].label}
                      </span>
                    </div>
                    <div className="text-sm font-medium leading-snug">{f.title}</div>
                    <p className="mt-1 text-xs text-muted-foreground leading-relaxed">{f.summary}</p>
                    <div className="mt-2 rounded-md bg-primary/5 border border-primary/15 p-2 text-xs leading-relaxed">
                      <span className="font-medium text-primary">Fix:</span> {f.recommendation}
                    </div>
                  </motion.div>
                );
              })}
            </TabsContent>
            <TabsContent value="timeline" className="flex-1 m-0 overflow-y-auto px-4 pb-4">
              <Timeline />
            </TabsContent>
            <TabsContent value="chat" className="flex-1 m-0 flex flex-col">
              <ChatPanel />
            </TabsContent>
          </Tabs>
        </div>
      </div>
    </div>
  );
}

function Timeline() {
  const events = [
    { t: "Diagram ingested", at: "10:14:02", done: true },
    { t: "Graph reconstruction", at: "10:14:08", done: true },
    { t: "Scalability agent", at: "10:14:14", done: true },
    { t: "Security agent", at: "10:14:18", done: true },
    { t: "Reliability agent", at: "10:14:22", done: true },
    { t: "Performance agent", at: "10:14:26", done: true },
    { t: "Cost agent", at: "10:14:31", done: true },
    { t: "Maintainability agent", at: "10:14:34", done: true },
    { t: "Observability agent", at: "10:14:37", done: true },
    { t: "Synthesis & scoring", at: "10:14:42", done: true },
  ];
  return (
    <ol className="relative border-l border-border ml-2 space-y-3 pt-2">
      {events.map((e, i) => (
        <li key={i} className="ml-4">
          <div className="absolute -left-1.5 mt-1.5 h-3 w-3 rounded-full bg-success ring-4 ring-card" />
          <div className="flex items-center justify-between">
            <span className="text-sm font-medium">{e.t}</span>
            <span className="text-[11px] text-muted-foreground font-mono">{e.at}</span>
          </div>
        </li>
      ))}
    </ol>
  );
}

function ChatPanel() {
  const [messages, setMessages] = useState<Array<{ role: "user" | "assistant"; text: string }>>([
    { role: "assistant", text: "Ask anything about this architecture — I have full context of the diagram and all findings." },
  ]);
  const [input, setInput] = useState("");
  const send = () => {
    if (!input.trim()) return;
    setMessages((m) => [...m, { role: "user", text: input }]);
    setInput("");
    setTimeout(() => {
      // TODO: stream response from FastAPI /chat endpoint
      setMessages((m) => [...m, { role: "assistant", text: "The biggest blocker right now is the missing DLQ on the order service — that's a critical reliability gap. Want me to draft a fix?" }]);
    }, 600);
  };
  return (
    <>
      <div className="flex-1 overflow-y-auto px-4 py-2 space-y-3 scrollbar-thin">
        {messages.map((m, i) => (
          <div key={i} className={cn("flex", m.role === "user" ? "justify-end" : "justify-start")}>
            <div className={cn(
              "max-w-[85%] rounded-lg px-3 py-2 text-sm leading-relaxed",
              m.role === "user"
                ? "bg-primary text-primary-foreground"
                : "bg-muted/50 text-foreground"
            )}>{m.text}</div>
          </div>
        ))}
      </div>
      <div className="p-3 border-t border-border flex gap-2">
        <Input
          value={input}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === "Enter" && send()}
          placeholder="Ask about scalability, security, costs…"
        />
        <Button size="icon" onClick={send} className="bg-gradient-primary text-primary-foreground">
          <Send className="h-4 w-4" />
        </Button>
      </div>
    </>
  );
}
