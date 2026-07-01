import { useState, useRef, useEffect } from "react";
import { useMutation } from "@tanstack/react-query";
import {
  Sparkles,
  Loader2,
  Copy,
  Check,
  Send,
  MessageSquare,
  HelpCircle,
  HelpCircle as QuestionIcon,
  BookOpen,
} from "lucide-react";
import { PageHeader } from "@/components/PageHeader";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { toast } from "sonner";
import { api } from "@/lib/api";

type Message = {
  role: "user" | "assistant";
  content: string;
};

export default function PairArchitect() {
  const [history, setHistory] = useState<Message[]>([
    {
      role: "assistant",
      content: "Hello! I am your AI Pair Architect. Let's design a system together. Tell me about what you are building (e.g. 'We are building a real-time ride sharing app for 5 million users').",
    },
  ]);
  const [currentMermaid, setCurrentMermaid] = useState<string>("graph TD\n  Client[Client] --> Gateway[API Gateway]\n  Gateway --> Service[Core Service]\n");
  const [input, setInput] = useState("");
  const [suggested, setSuggested] = useState<string[]>([
    "Design a scalable notification service",
    "Design a high-volume analytics ingestion pipeline",
  ]);
  const [copied, setCopied] = useState(false);

  const scrollRef = useRef<HTMLDivElement>(null);

  useEffect(() => {
    scrollRef.current?.scrollIntoView({ behavior: "smooth" });
  }, [history]);

  const pairMutation = useMutation({
    mutationFn: (msg: string) =>
      api.runPairArchitectSession({
        current_mermaid: currentMermaid,
        history,
        new_message: msg,
      }),
    onSuccess: (data) => {
      // Append AI response
      setHistory((prev) => [
        ...prev,
        { role: "assistant", content: data.ai_reply || "Diagram updated." },
      ]);
      if (data.updated_mermaid) {
        setCurrentMermaid(data.updated_mermaid);
      }
      if (data.suggested_questions) {
        setSuggested(data.suggested_questions);
      }
    },
    onError: () => {
      toast.error("Failed to fetch response from Pair Architect.");
    },
  });

  const handleSendMessage = (msgText: string) => {
    if (!msgText.trim() || pairMutation.isPending) return;

    // Append user message
    setHistory((prev) => [...prev, { role: "user", content: msgText }]);
    setInput("");
    pairMutation.mutate(msgText);
  };

  const handleCopy = () => {
    navigator.clipboard.writeText(currentMermaid);
    setCopied(true);
    toast.success("Mermaid code copied!");
    setTimeout(() => setCopied(false), 2000);
  };

  return (
    <div className="p-6 md:p-8 max-w-6xl mx-auto space-y-8 h-[calc(100vh-100px)] flex flex-col">
      <div className="shrink-0">
        <PageHeader
          title="AI Pair Architect"
          description="Design architectures interactively. Converse with the AI to refine components and build structural charts in real-time."
        />
      </div>

      <div className="grid lg:grid-cols-2 gap-6 flex-1 min-h-0 overflow-hidden">
        {/* Left Panel: Chat Dialogue */}
        <div className="rounded-xl border border-border bg-card flex flex-col h-full overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center gap-2">
            <MessageSquare className="h-4.5 w-4.5 text-primary" />
            <span className="text-sm font-semibold text-foreground">Interactive Session</span>
          </div>

          {/* Messages */}
          <div className="flex-1 overflow-y-auto p-4 space-y-4">
            {history.map((msg, idx) => (
              <div
                key={idx}
                className={`flex ${msg.role === "user" ? "justify-end" : "justify-start"}`}
              >
                <div
                  className={`max-w-[85%] rounded-xl p-3.5 text-sm leading-relaxed ${
                    msg.role === "user"
                      ? "bg-primary text-primary-foreground font-medium"
                      : "border border-border bg-muted/40 text-muted-foreground"
                  }`}
                >
                  {msg.content}
                </div>
              </div>
            ))}
            <div ref={scrollRef} />
          </div>

          {/* Suggestions */}
          {suggested.length > 0 && (
            <div className="p-3 border-t border-border bg-background/50 space-y-1.5 shrink-0">
              <div className="text-[10px] uppercase font-bold text-muted-foreground tracking-wider flex items-center gap-1">
                <QuestionIcon className="h-3 w-3" />
                Suggested Refinements
              </div>
              <div className="flex flex-wrap gap-1">
                {suggested.map((q, idx) => (
                  <button
                    key={idx}
                    type="button"
                    onClick={() => handleSendMessage(q)}
                    className="text-[10px] px-2.5 py-1.5 rounded-full border border-border bg-card hover:bg-muted text-muted-foreground hover:text-foreground text-left transition"
                  >
                    {q}
                  </button>
                ))}
              </div>
            </div>
          )}

          {/* Input Area */}
          <div className="p-3 border-t border-border bg-muted/10 shrink-0 flex gap-2">
            <Input
              value={input}
              onChange={(e) => setInput(e.target.value)}
              onKeyDown={(e) => {
                if (e.key === "Enter") handleSendMessage(input);
              }}
              placeholder="Suggest a database, or ask to add a component..."
              className="flex-1 bg-background/60"
            />
            <Button
              onClick={() => handleSendMessage(input)}
              disabled={!input.trim() || pairMutation.isPending}
              className="bg-gradient-primary text-primary-foreground hover:opacity-90 shadow-glow shrink-0 h-10 px-4"
            >
              {pairMutation.isPending ? (
                <Loader2 className="h-4.5 w-4.5 animate-spin" />
              ) : (
                <Send className="h-4.5 w-4.5" />
              )}
            </Button>
          </div>
        </div>

        {/* Right Panel: Live Blueprint Chart Code */}
        <div className="rounded-xl border border-border bg-card flex flex-col h-full overflow-hidden">
          <div className="px-4 py-3 border-b border-border bg-muted/20 flex items-center justify-between shrink-0">
            <div className="flex items-center gap-2">
              <BookOpen className="h-4.5 w-4.5 text-primary" />
              <span className="text-sm font-semibold text-foreground">Iterative Blueprint (Mermaid)</span>
            </div>
            <Button
              variant="outline"
              size="sm"
              onClick={handleCopy}
              className="h-8 gap-1.5"
            >
              {copied ? <Check className="h-3.5 w-3.5 text-emerald-400" /> : <Copy className="h-3.5 w-3.5" />}
              {copied ? "Copied" : "Copy"}
            </Button>
          </div>

          <div className="flex-1 p-4 overflow-y-auto bg-background/50 font-mono text-xs text-muted-foreground whitespace-pre-wrap leading-normal">
            {currentMermaid}
          </div>
        </div>
      </div>
    </div>
  );
}
