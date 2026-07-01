import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload as UploadIcon, FolderKanban, GitCompare,
  Users, Settings as Cog, CreditCard, Search, ChevronDown, Menu,
  Sparkles, RefreshCw, Activity, Flame, MessageSquare, Award, GitPullRequest,
  Bot, DollarSign, ShieldAlert, Cloud
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
      { to: "/finops", label: "FinOps cost optimizer", icon: DollarSign },
      { to: "/compliance", label: "Compliance check", icon: ShieldAlert },
    ],
  },
  {
    title: "Team",
    items: [
      { to: "/workspaces", label: "Workspaces", icon: Users },
      { to: "/integrations", label: "CI/CD Webhooks", icon: GitPullRequest },
      { to: "/cloud", label: "Live Cloud sync", icon: Cloud },
    ],
  },
];

const SECONDARY = [
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

  const usagePct = stats ? Math.min(100, Math.round((stats.analyses_used / stats.analyses_limit) * 100)) : 0;

  const handleSignOut = async () => {
    await signOut();
    navigate("/login");
  };

  const NavLinks = ({ onNavigate }: { onNavigate?: () => void }) => (
    <>
      {NAV_SECTIONS.map((section) => (
        <div key={section.title}>
          <div className="px-3 pt-4 pb-1.5 text-[11px] uppercase tracking-wider text-muted-foreground font-medium">{section.title}</div>
          {section.items.map((i) => <NavItem key={i.to} {...i} onClick={onNavigate} />)}
        </div>
      ))}
      <div className="px-3 pt-6 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Account</div>
      {SECONDARY.map((i) => <NavItem key={i.to} {...i} onClick={onNavigate} />)}
    </>
  );

  return (
    <div className="h-screen w-full flex bg-background text-foreground">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <Logo />
        </div>
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button type="button" className="w-full flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm hover:bg-sidebar-accent transition">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-5 w-5 rounded bg-gradient-primary grid place-items-center text-[10px] font-bold text-primary-foreground">
                    {(workspaces[0]?.name ?? "P")[0]}
                  </div>
                  <span className="truncate font-medium">{workspaces[0]?.name ?? "Personal"}</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              {workspaces.map((w) => (
                <DropdownMenuItem key={w.id}>{w.name}</DropdownMenuItem>
              ))}
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/workspaces")}>Manage workspaces</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          <NavLinks />
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-lg border border-sidebar-border p-3 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="text-xs font-medium capitalize">{stats?.plan ?? "hobby"} plan</div>
            <div className="text-[11px] text-muted-foreground mb-2">
              {stats?.analyses_used ?? 0} of {stats?.analyses_limit ?? 10} analyses used
            </div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full bg-gradient-primary" style={{ width: `${usagePct}%` }} />
            </div>
            <Button size="sm" className="w-full mt-3" onClick={() => navigate("/pricing")}>Upgrade</Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 md:px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <Sheet>
            <SheetTrigger asChild>
              <Button variant="ghost" size="icon" className="md:hidden h-9 w-9" aria-label="Open menu">
                <Menu className="h-5 w-5" />
              </Button>
            </SheetTrigger>
            <SheetContent side="left" className="w-72 p-0 bg-sidebar">
              <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
                <Logo />
              </div>
              <nav className="p-2 space-y-0.5">
                <NavLinks />
              </nav>
            </SheetContent>
          </Sheet>

          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search analyses…" className="pl-8 h-9 bg-muted/40 border-transparent focus-visible:bg-background" onKeyDown={(e) => {
              if (e.key === "Enter") navigate(`/analyses?q=${encodeURIComponent((e.target as HTMLInputElement).value)}`);
            }} />
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <NotificationBell />
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button type="button" className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">{initials}</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60 hidden sm:block" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">{user?.full_name ?? "User"}</div>
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
    </div>
  );
}

function NavItem({ to, label, icon: Icon, onClick }: {
  to: string; label: string; icon: React.ComponentType<{ className?: string }>; onClick?: () => void;
}) {
  return (
    <NavLink
      to={to}
      onClick={onClick}
      className={({ isActive }) =>
        cn(
          "flex items-center gap-2.5 px-3 py-1.5 rounded-md text-sm transition-colors",
          isActive
            ? "bg-sidebar-accent text-sidebar-accent-foreground font-medium"
            : "text-sidebar-foreground hover:bg-sidebar-accent/60"
        )
      }
    >
      <Icon className="h-4 w-4" />
      {label}
    </NavLink>
  );
}
