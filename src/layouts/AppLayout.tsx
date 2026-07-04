import { useState } from "react";
import { Outlet, NavLink, useNavigate } from "react-router-dom";
import { CommandPalette } from "@/components/CommandPalette";
import {
  LayoutDashboard, Upload as UploadIcon, FolderKanban, GitCompare,
  Users, Settings as Cog, CreditCard, Search, ChevronDown, Menu,
  RefreshCw, Activity, Flame, MessageSquare, Award, GitPullRequest,
  Bot, DollarSign, ShieldAlert, Cloud, TrendingUp, Sparkles,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import { NotificationBell } from "@/components/NotificationBell";
import { Sheet, SheetContent, SheetTrigger } from "@/components/ui/sheet";
import { useAuth } from "@/contexts/AuthContext";
import { useQuery } from "@tanstack/react-query";
import { api } from "@/lib/api";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

type NavItem = { to: string; label: string; icon: any };
type NavSection = { title: string; items: NavItem[] };

const NAV_SECTIONS: NavSection[] = [
  {
    title: "Create",
    items: [
      { to: "/generate", label: "Generate Architecture", icon: Sparkles },
      { to: "/pair-architect", label: "AI Pair Architect", icon: Bot },
      { to: "/upload", label: "New Analysis", icon: UploadIcon },
    ],
  },
  {
    title: "Review",
    items: [
      { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
      { to: "/analyses", label: "Analyses", icon: FolderKanban },
      { to: "/compare", label: "Compare", icon: GitCompare },
      { to: "/benchmarks", label: "Benchmarks", icon: Award },
      { to: "/score-history", label: "Score History", icon: TrendingUp },
    ],
  },
  {
    title: "Simulate",
    items: [
      { to: "/simulate", label: "Traffic Simulation", icon: Activity },
      { to: "/chaos", label: "Chaos Simulator", icon: Flame },
      { to: "/debate", label: "Multi-Agent Debate", icon: MessageSquare },
    ],
  },
  {
    title: "Optimize",
    items: [
      { to: "/finops", label: "FinOps Optimizer", icon: DollarSign },
      { to: "/compliance", label: "Compliance Check", icon: ShieldAlert },
    ],
  },
  {
    title: "Team",
    items: [
      { to: "/workspaces", label: "Workspaces", icon: Users },
      { to: "/integrations", label: "CI/CD Webhooks", icon: GitPullRequest },
      { to: "/cloud", label: "Live Cloud Sync", icon: Cloud },
    ],
  },
];

const SECONDARY: NavItem[] = [
  { to: "/settings", label: "Settings", icon: Cog },
  { to: "/billing", label: "Billing", icon: CreditCard },
];

export default function AppLayout() {
  const navigate = useNavigate();
  const { user, signOut } = useAuth();
  const { data: stats } = useQuery({
    queryKey: ["dashboard-stats"],
    queryFn: () => api.dashboardStats(),
  });
  const { data: workspaces = [] } = useQuery({
    queryKey: ["workspaces"],
    queryFn: () => api.listWorkspaces(),
  });

  const initials = (user?.full_name || user?.email || "?")
    .split(" ")
    .map((s) => s[0])
    .join("")
    .slice(0, 2)
    .toUpperCase();

  const usagePct = stats
    ? Math.min(100, Math.round((stats.analyses_used / stats.analyses_limit) * 100))
    : 0;

  const [cmdOpen, setCmdOpen] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title} className="mb-1">
          <div
            className="px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest text-muted-foreground"
          >
            {section.title}
          </div>
          {section.items.map((i) => (
            <SideNavItem key={i.to} {...i} onClick={onNavigate} />
          ))}
        </div>
      ))}
      <div
        className="px-3 pt-5 pb-1 text-[10px] font-bold uppercase tracking-widest mt-1 text-muted-foreground"
      >
        Account
      </div>
      {SECONDARY.map((i) => (
        <SideNavItem key={i.to} {...i} onClick={onNavigate} />
      ))}
    </>
  );

  return (
    <div className="h-screen w-full flex bg-background text-foreground">
      {/* Sidebar */}
      <aside
        className="hidden md:flex w-[220px] shrink-0 flex-col bg-card"
        style={{ borderRight: "1px solid hsl(var(--border))" }}
      >
        {/* Logo bar */}
        <div
          className="h-14 flex items-center px-4"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}
        >
          <Logo />
        </div>

        {/* Workspace picker */}
        <div className="px-3 pt-3 pb-1">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button
                type="button"
                className="w-full flex items-center justify-between gap-2 rounded-md px-3 py-2 text-sm transition-colors"
                style={{ border: "1px solid hsl(var(--border))", background: "hsl(var(--muted))" }}
                onMouseEnter={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--accent))";
                }}
                onMouseLeave={(e) => {
                  (e.currentTarget as HTMLButtonElement).style.background = "hsl(var(--muted))";
                }}
              >
                <div className="flex items-center gap-2 min-w-0">
                  <div
                    className="h-5 w-5 rounded grid place-items-center text-[10px] font-bold text-white flex-shrink-0"
                    style={{ background: "hsl(222 62% 11%)" }}
                  >
                    {(workspaces[0]?.name ?? "P")[0]}
                  </div>
                  <span className="truncate font-medium text-sm">
                    {workspaces[0]?.name ?? "Personal"}
                  </span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-50 flex-shrink-0" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-52">
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id}>{w.name}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/workspaces")}>
                Manage workspaces
              </DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>

        {/* Nav */}
        <nav className="flex-1 px-2 py-1 overflow-y-auto scrollbar-thin">
          <NavLinks />
        </nav>

        {/* Usage panel */}
        <div
          className="m-3 rounded-lg p-4"
          style={{
            border: "1px solid hsl(var(--border))",
            background: "hsl(var(--muted))",
          }}
        >
          <div className="flex items-center justify-between mb-1">
            <div className="text-xs font-semibold capitalize">{stats?.plan ?? "hobby"}</div>
            <span
              className="text-[10px] font-semibold px-1.5 py-0.5 rounded"
              style={{ background: "hsl(16 76% 52% / 0.12)", color: "hsl(16 76% 44%)" }}
            >
              {usagePct}%
            </span>
          </div>
          <div className="text-[11px] text-muted-foreground mb-2.5">
            {stats?.analyses_used ?? 0} / {stats?.analyses_limit ?? 10} analyses
          </div>
          <div className="h-1.5 rounded-full overflow-hidden" style={{ background: "hsl(var(--border))" }}>
            <div
              className="h-full rounded-full transition-all"
              style={{ width: `${usagePct}%`, background: "hsl(16 76% 52%)" }}
            />
          </div>
          <button
            onClick={() => navigate("/pricing")}
            className="w-full mt-3 rounded-md py-2 text-xs font-semibold text-white transition-all"
            style={{
              background: "hsl(222 62% 11%)",
              transition: "background 0.15s ease",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "hsl(222 50% 18%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.background = "hsl(222 62% 11%)";
            }}
          >
            Upgrade plan
          </button>
        </div>
      </aside>

      {/* Main */}
      <div className="flex-1 flex flex-col min-w-0">
        {/* Top header */}
        <header
          className="h-14 flex items-center gap-3 px-4 md:px-6 sticky top-0 z-30 bg-background"
          style={{ borderBottom: "1px solid hsl(var(--border))" }}
        >
          {/* Mobile menu trigger */}
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-[220px] p-0 bg-card border-border">
              <div
                className="h-14 flex items-center px-4"
                style={{ borderBottom: "1px solid hsl(var(--border))" }}
              >
                <Logo />
              </div>
              <nav className="p-2">
                <NavLinks onNavigate={() => {}} />
              </nav>
            </SheetContent>
          </Sheet>

          {/* Search */}
          <div className="relative max-w-sm flex-1">
            <Search
              className="absolute left-3 top-1/2 -translate-y-1/2 h-3.5 w-3.5 text-muted-foreground"
            />
            <input
              placeholder="Search analyses…"
              className="w-full pl-9 pr-4 py-2 text-sm rounded-md outline-none transition-all"
              style={{
                background: "hsl(var(--muted))",
                border: "1px solid hsl(var(--border))",
                color: "hsl(var(--foreground))",
                fontFamily: "Manrope, sans-serif",
              }}
              onFocus={(e) => {
                e.currentTarget.style.borderColor = "hsl(16 76% 52%)";
                e.currentTarget.style.boxShadow = "0 0 0 3px hsl(16 76% 52% / 0.12)";
              }}
              onBlur={(e) => {
                e.currentTarget.style.borderColor = "hsl(var(--border))";
                e.currentTarget.style.boxShadow = "";
              }}
              onKeyDown={(e) => {
                if (e.key === "Enter") {
                  navigate(`/analyses?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
                }
              }}
            />
          </div>

          {/* Command palette trigger pill */}
          <button
            type="button"
            onClick={() => setCmdOpen(true)}
            className="hidden sm:flex items-center gap-1.5 rounded-full px-3 py-1 text-xs font-semibold transition-all"
            style={{
              border: "1px solid hsl(var(--border))",
              background: "hsl(var(--muted))",
              color: "hsl(var(--muted-foreground))",
              fontFamily: "Manrope, sans-serif",
              cursor: "pointer",
              whiteSpace: "nowrap",
            }}
            onMouseEnter={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(16 76% 52%)";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(16 76% 44%)";
            }}
            onMouseLeave={(e) => {
              (e.currentTarget as HTMLButtonElement).style.borderColor = "hsl(var(--border))";
              (e.currentTarget as HTMLButtonElement).style.color = "hsl(var(--muted-foreground))";
            }}
          >
            <Search className="h-3 w-3" />
            <span>Search</span>
            <kbd
              style={{
                display: "inline-flex",
                alignItems: "center",
                padding: "0px 4px",
                borderRadius: "3px",
                fontSize: "10px",
                fontFamily: "Manrope, sans-serif",
                color: "hsl(var(--muted-foreground))",
                background: "hsl(var(--background))",
                border: "1px solid hsl(var(--border))",
                userSelect: "none",
                marginLeft: "2px",
              }}
            >
              ⌘K
            </kbd>
          </button>

          {/* Right actions */}
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button
                  type="button"
                  className="flex items-center gap-2 pl-2 pr-1.5 py-1 rounded-md transition-colors hover:bg-muted"
                >
                  <div
                    className="h-7 w-7 rounded-full grid place-items-center text-xs font-bold text-white flex-shrink-0"
                    style={{ background: "hsl(222 62% 11%)" }}
                  >
                    {initials}
                  </div>
                  <ChevronDown className="h-3.5 w-3.5 opacity-50 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-semibold">{user?.full_name ?? "User"}</div>
                  <div className="text-xs font-normal text-muted-foreground">{user?.email}</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/billing")}>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={handleSignOut}>Sign out</DropdownMenuItem>
              </DropdownMenuContent>
            </DropdownMenu>
          </div>
        </header>

        <main className="flex-1 overflow-y-auto">
          <Outlet />
        </main>
      </div>

      {/* Command palette — fixed overlay, lives here so it inherits the router context */}
      <CommandPalette
        isOpen={cmdOpen}
        onOpen={() => setCmdOpen(true)}
        onClose={() => setCmdOpen(false)}
      />
    </div>
  );
}

function SideNavItem({
  to, label, icon: Icon, onClick,
}: {
  to: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "group flex items-center gap-2.5 px-3 py-[7px] rounded-md text-[13px] font-medium transition-all relative",
          isActive
            ? "bg-muted text-foreground"
            : "text-muted-foreground hover:text-foreground hover:bg-muted/60"
        )
      }
      style={({ isActive }) =>
        isActive
          ? { borderLeft: "3px solid hsl(16 76% 52%)", paddingLeft: "calc(0.75rem - 3px)" }
          : { borderLeft: "3px solid transparent", paddingLeft: "calc(0.75rem - 3px)" }
      }
    >
      <Icon className="h-3.5 w-3.5 flex-shrink-0" />
      {label}
    </NavLink>
  );
}
