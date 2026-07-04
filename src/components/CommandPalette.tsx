import { useEffect, useRef } from "react";
import { useNavigate } from "react-router-dom";
import { motion, AnimatePresence } from "framer-motion";
import {
  Search, LayoutDashboard, Upload, Sparkles, FolderKanban,
  Settings, CreditCard, Activity, Flame, MessageSquare,
  DollarSign, ShieldAlert, Cloud, GitPullRequest, Users,
  Award, TrendingUp, Bot, GitCompare, ArrowRight,
} from "lucide-react";
import { useState } from "react";

type CommandItem = {
  label: string;
  icon: React.ComponentType<{ size?: number; style?: React.CSSProperties; className?: string }>;
  to: string;
  keywords?: string[];
};

type CommandGroup = {
  group: string;
  items: CommandItem[];
};

const COMMANDS: CommandGroup[] = [
  {
    group: "Navigate",
    items: [
      { label: "Dashboard", icon: LayoutDashboard, to: "/dashboard", keywords: ["home", "overview"] },
      { label: "New Analysis", icon: Upload, to: "/upload", keywords: ["upload", "analyze"] },
      { label: "Generate Architecture", icon: Sparkles, to: "/generate", keywords: ["ai", "create", "build"] },
      { label: "Analyses", icon: FolderKanban, to: "/analyses", keywords: ["list", "history", "projects"] },
      { label: "Compare", icon: GitCompare, to: "/compare", keywords: ["diff", "versus"] },
      { label: "Benchmarks", icon: Award, to: "/benchmarks", keywords: ["score", "rank"] },
      { label: "Score History", icon: TrendingUp, to: "/score-history", keywords: ["chart", "trends"] },
      { label: "AI Pair Architect", icon: Bot, to: "/pair-architect", keywords: ["pair", "assistant"] },
    ],
  },
  {
    group: "Simulate",
    items: [
      { label: "Traffic Simulation", icon: Activity, to: "/simulate", keywords: ["load", "traffic"] },
      { label: "Chaos Simulator", icon: Flame, to: "/chaos", keywords: ["failure", "resilience"] },
      { label: "Multi-Agent Debate", icon: MessageSquare, to: "/debate", keywords: ["agents", "discussion"] },
    ],
  },
  {
    group: "Optimize",
    items: [
      { label: "FinOps Optimizer", icon: DollarSign, to: "/finops", keywords: ["cost", "finance", "money"] },
      { label: "Compliance Check", icon: ShieldAlert, to: "/compliance", keywords: ["security", "rules"] },
    ],
  },
  {
    group: "Account",
    items: [
      { label: "Settings", icon: Settings, to: "/settings", keywords: ["preferences", "config"] },
      { label: "Billing", icon: CreditCard, to: "/billing", keywords: ["payment", "plan", "invoice"] },
      { label: "Workspaces", icon: Users, to: "/workspaces", keywords: ["team", "org"] },
      { label: "CI/CD Webhooks", icon: GitPullRequest, to: "/integrations", keywords: ["webhook", "pipeline"] },
      { label: "Live Cloud Sync", icon: Cloud, to: "/cloud", keywords: ["sync", "aws", "gcp"] },
    ],
  },
];

interface CommandPaletteProps {
  isOpen: boolean;
  onOpen: () => void;
  onClose: () => void;
}

export function CommandPalette({ isOpen, onOpen, onClose }: CommandPaletteProps) {
  const navigate = useNavigate();
  const [query, setQuery] = useState("");
  const [activeIndex, setActiveIndex] = useState(0);
  const inputRef = useRef<HTMLInputElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  // Global Ctrl+K / Cmd+K shortcut
  useEffect(() => {
    const handler = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === "k") {
        e.preventDefault();
        if (isOpen) {
          onClose();
        } else {
          onOpen();
        }
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, [isOpen, onOpen, onClose]);

  // Focus input and reset state when opened
  useEffect(() => {
    if (isOpen) {
      setQuery("");
      setActiveIndex(0);
      const t = setTimeout(() => inputRef.current?.focus(), 40);
      return () => clearTimeout(t);
    }
  }, [isOpen]);

  // Filter groups based on query
  const filteredGroups = COMMANDS.map((group) => ({
    ...group,
    items: group.items.filter((item) => {
      if (!query) return true;
      const q = query.toLowerCase();
      return (
        item.label.toLowerCase().includes(q) ||
        item.to.toLowerCase().includes(q) ||
        item.keywords?.some((k) => k.toLowerCase().includes(q))
      );
    }),
  })).filter((group) => group.items.length > 0);

  // Flat ordered list for keyboard navigation
  const flatItems = filteredGroups.flatMap((g) => g.items);

  // Reset active index when search changes
  useEffect(() => {
    setActiveIndex(0);
  }, [query]);

  // Scroll active item into view
  useEffect(() => {
    if (listRef.current) {
      const el = listRef.current.querySelector("[data-active='true']") as HTMLElement | null;
      el?.scrollIntoView({ block: "nearest" });
    }
  }, [activeIndex]);

  const handleKeyDown = (e: React.KeyboardEvent) => {
    switch (e.key) {
      case "Escape":
        onClose();
        break;
      case "ArrowDown":
        e.preventDefault();
        setActiveIndex((i) => Math.min(i + 1, flatItems.length - 1));
        break;
      case "ArrowUp":
        e.preventDefault();
        setActiveIndex((i) => Math.max(i - 1, 0));
        break;
      case "Enter": {
        const item = flatItems[activeIndex];
        if (item) {
          navigate(item.to);
          onClose();
        }
        break;
      }
    }
  };

  let flatIdx = 0;

  return (
    <AnimatePresence>
      {isOpen && (
        <>
          {/* Backdrop */}
          <motion.div
            key="cmd-backdrop"
            initial={{ opacity: 0 }}
            animate={{ opacity: 1 }}
            exit={{ opacity: 0 }}
            transition={{ duration: 0.15 }}
            onClick={onClose}
            style={{
              position: "fixed",
              inset: 0,
              background: "hsl(0 0% 0% / 0.5)",
              zIndex: 50,
            }}
          />

          {/* Panel — x: "-50%" handles centering without CSS transform conflict */}
          <motion.div
            key="cmd-panel"
            initial={{ opacity: 0, scale: 0.96, y: -10, x: "-50%" }}
            animate={{ opacity: 1, scale: 1, y: 0, x: "-50%" }}
            exit={{ opacity: 0, scale: 0.95, y: -10, x: "-50%" }}
            transition={{ duration: 0.15, ease: [0.16, 1, 0.3, 1] }}
            onKeyDown={handleKeyDown}
            style={{
              position: "fixed",
              top: "5.5rem",
              left: "50%",
              width: "calc(100% - 32px)",
              maxWidth: "512px",
              zIndex: 51,
              background: "hsl(var(--card))",
              border: "1px solid hsl(var(--border))",
              borderRadius: "12px",
              boxShadow:
                "0 20px 64px hsl(0 0% 0% / 0.2), 0 4px 16px hsl(0 0% 0% / 0.1)",
              overflow: "hidden",
              fontFamily: "Manrope, sans-serif",
            }}
          >
            {/* Search row */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "12px",
                padding: "0 20px",
                borderBottom: "1px solid hsl(var(--border))",
              }}
            >
              <Search size={16} style={{ color: "hsl(var(--muted-foreground))", flexShrink: 0 }} />
              <input
                ref={inputRef}
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                onKeyDown={handleKeyDown}
                placeholder="Search commands…"
                style={{
                  flex: 1,
                  padding: "16px 0",
                  border: "none",
                  outline: "none",
                  background: "transparent",
                  fontSize: "15px",
                  fontFamily: "Manrope, sans-serif",
                  color: "hsl(222 62% 11%)",
                }}
              />
              <kbd
                style={{
                  display: "inline-flex",
                  alignItems: "center",
                  padding: "2px 6px",
                  borderRadius: "4px",
                  fontSize: "11px",
                  fontFamily: "Manrope, sans-serif",
                  color: "hsl(var(--muted-foreground))",
                  background: "hsl(var(--muted))",
                  border: "1px solid hsl(var(--border))",
                  flexShrink: 0,
                  userSelect: "none",
                }}
              >
                esc
              </kbd>
            </div>

            {/* Command list */}
            <div
              ref={listRef}
              style={{ maxHeight: "380px", overflowY: "auto", padding: "6px 0" }}
            >
              {filteredGroups.length === 0 ? (
                <div
                  style={{
                    padding: "28px 16px",
                    textAlign: "center",
                    color: "hsl(var(--muted-foreground))",
                    fontSize: "14px",
                  }}
                >
                  No commands match &ldquo;{query}&rdquo;
                </div>
              ) : (
                filteredGroups.map((group) => (
                  <div key={group.group}>
                    {/* Group label */}
                    <div
                      style={{
                        padding: "10px 16px 4px",
                        fontSize: "10px",
                        fontWeight: 700,
                        textTransform: "uppercase",
                        letterSpacing: "0.1em",
                        color: "hsl(16 76% 52%)",
                        userSelect: "none",
                      }}
                    >
                      {group.group}
                    </div>

                    {/* Items */}
                    {group.items.map((item) => {
                      const myIdx = flatIdx++;
                      const isActive = myIdx === activeIndex;
                      return (
                        <button
                          key={item.to}
                          data-active={isActive}
                          type="button"
                          onClick={() => {
                            navigate(item.to);
                            onClose();
                          }}
                          onMouseEnter={() => setActiveIndex(myIdx)}
                          style={{
                            display: "flex",
                            alignItems: "center",
                            gap: "10px",
                            width: "100%",
                            padding: "10px 16px 10px 13px",
                            border: "none",
                            borderLeft: isActive
                              ? "3px solid hsl(16 76% 52%)"
                              : "3px solid transparent",
                            background: isActive ? "hsl(var(--muted))" : "transparent",
                            cursor: "pointer",
                            textAlign: "left",
                            fontFamily: "Manrope, sans-serif",
                            fontSize: "14px",
                            fontWeight: 500,
                            color: "hsl(222 62% 11%)",
                            transition: "background 0.08s ease",
                          }}
                        >
                          <item.icon
                            size={15}
                            style={{
                              color: isActive ? "hsl(16 76% 52%)" : "hsl(var(--muted-foreground))",
                              flexShrink: 0,
                              transition: "color 0.08s ease",
                            }}
                          />
                          <span style={{ flex: 1 }}>{item.label}</span>
                          {isActive && (
                            <ArrowRight
                              size={13}
                              style={{ color: "hsl(16 76% 52%)", flexShrink: 0 }}
                            />
                          )}
                        </button>
                      );
                    })}
                  </div>
                ))
              )}
            </div>

            {/* Footer hints */}
            <div
              style={{
                display: "flex",
                alignItems: "center",
                gap: "16px",
                padding: "8px 16px",
                borderTop: "1px solid hsl(var(--border))",
                background: "hsl(var(--muted))",
              }}
            >
              {(
                [
                  { keys: ["↑", "↓"], label: "navigate" },
                  { keys: ["↵"], label: "open" },
                  { keys: ["esc"], label: "close" },
                ] as { keys: string[]; label: string }[]
              ).map(({ keys, label }) => (
                <div
                  key={label}
                  style={{ display: "flex", alignItems: "center", gap: "4px" }}
                >
                  {keys.map((k) => (
                    <kbd
                      key={k}
                      style={{
                        padding: "1px 5px",
                        borderRadius: "3px",
                        fontSize: "11px",
                        fontFamily: "Manrope, sans-serif",
                        color: "hsl(var(--muted-foreground))",
                        background: "hsl(var(--card))",
                        border: "1px solid hsl(var(--border))",
                        userSelect: "none",
                      }}
                    >
                      {k}
                    </kbd>
                  ))}
                  <span style={{ fontSize: "11px", color: "hsl(var(--muted-foreground))", marginLeft: "2px" }}>
                    {label}
                  </span>
                </div>
              ))}
            </div>
          </motion.div>
        </>
      )}
    </AnimatePresence>
  );
}
