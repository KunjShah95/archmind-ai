import { Outlet, NavLink, useNavigate } from "react-router-dom";
import {
  LayoutDashboard, Upload as UploadIcon, FolderKanban, GitCompare,
  Users, Settings as Cog, CreditCard, Search, Bell, ChevronDown,
} from "lucide-react";
import { Logo } from "@/components/Logo";
import { cn } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Avatar, AvatarFallback } from "@/components/ui/avatar";
import { ThemeToggle } from "@/components/ThemeToggle";
import {
  DropdownMenu, DropdownMenuContent, DropdownMenuItem, DropdownMenuLabel,
  DropdownMenuSeparator, DropdownMenuTrigger,
} from "@/components/ui/dropdown-menu";

const NAV = [
  { to: "/dashboard", label: "Dashboard", icon: LayoutDashboard },
  { to: "/upload", label: "New Analysis", icon: UploadIcon },
  { to: "/analyses", label: "Analyses", icon: FolderKanban },
  { to: "/compare", label: "Compare", icon: GitCompare },
  { to: "/workspaces", label: "Workspaces", icon: Users },
];

const SECONDARY = [
  { to: "/settings", label: "Settings", icon: Cog },
  { to: "/billing", label: "Billing", icon: CreditCard },
];

export default function AppLayout() {
  const navigate = useNavigate();
  return (
    <div className="h-screen w-full flex bg-background text-foreground">
      <aside className="hidden md:flex w-60 shrink-0 flex-col border-r border-border bg-sidebar">
        <div className="h-14 flex items-center px-5 border-b border-sidebar-border">
          <Logo />
        </div>
        <div className="p-3">
          <DropdownMenu>
            <DropdownMenuTrigger asChild>
              <button className="w-full flex items-center justify-between gap-2 rounded-md border border-sidebar-border bg-sidebar-accent/40 px-3 py-2 text-sm hover:bg-sidebar-accent transition">
                <div className="flex items-center gap-2 min-w-0">
                  <div className="h-5 w-5 rounded bg-gradient-primary grid place-items-center text-[10px] font-bold text-primary-foreground">P</div>
                  <span className="truncate font-medium">Platform</span>
                </div>
                <ChevronDown className="h-3.5 w-3.5 opacity-60" />
              </button>
            </DropdownMenuTrigger>
            <DropdownMenuContent align="start" className="w-56">
              <DropdownMenuLabel>Workspaces</DropdownMenuLabel>
              <DropdownMenuItem>Platform</DropdownMenuItem>
              <DropdownMenuItem>AI</DropdownMenuItem>
              <DropdownMenuItem>Infra</DropdownMenuItem>
              <DropdownMenuSeparator />
              <DropdownMenuItem onClick={() => navigate("/workspaces")}>Manage workspaces</DropdownMenuItem>
            </DropdownMenuContent>
          </DropdownMenu>
        </div>
        <nav className="flex-1 px-2 py-1 space-y-0.5 overflow-y-auto scrollbar-thin">
          {NAV.map((i) => (
            <NavItem key={i.to} {...i} />
          ))}
          <div className="px-3 pt-6 pb-2 text-[11px] uppercase tracking-wider text-muted-foreground">Account</div>
          {SECONDARY.map((i) => (
            <NavItem key={i.to} {...i} />
          ))}
        </nav>
        <div className="p-3 border-t border-sidebar-border">
          <div className="rounded-lg border border-sidebar-border p-3 bg-gradient-to-br from-primary/10 to-transparent">
            <div className="text-xs font-medium">Free plan</div>
            <div className="text-[11px] text-muted-foreground mb-2">3 of 10 analyses used</div>
            <div className="h-1.5 rounded bg-muted overflow-hidden">
              <div className="h-full w-[30%] bg-gradient-primary" />
            </div>
            <Button size="sm" className="w-full mt-3" onClick={() => navigate("/pricing")}>Upgrade</Button>
          </div>
        </div>
      </aside>

      <div className="flex-1 flex flex-col min-w-0">
        <header className="h-14 border-b border-border flex items-center gap-3 px-4 md:px-6 bg-background/80 backdrop-blur-xl sticky top-0 z-30">
          <div className="relative max-w-md flex-1">
            <Search className="absolute left-2.5 top-1/2 -translate-y-1/2 h-4 w-4 text-muted-foreground" />
            <Input placeholder="Search analyses, findings, components…" className="pl-8 h-9 bg-muted/40 border-transparent focus-visible:bg-background" />
            <kbd className="hidden md:inline-flex absolute right-2 top-1/2 -translate-y-1/2 items-center rounded border border-border bg-muted px-1.5 text-[10px] text-muted-foreground">⌘K</kbd>
          </div>
          <div className="ml-auto flex items-center gap-1.5">
            <ThemeToggle />
            <Button size="icon" variant="ghost" className="h-9 w-9 relative">
              <Bell className="h-4 w-4" />
              <span className="absolute top-2 right-2 h-1.5 w-1.5 rounded-full bg-primary" />
            </Button>
            <DropdownMenu>
              <DropdownMenuTrigger asChild>
                <button className="flex items-center gap-2 pl-2 pr-1 py-1 rounded-md hover:bg-muted">
                  <Avatar className="h-7 w-7">
                    <AvatarFallback className="bg-gradient-primary text-primary-foreground text-xs">AC</AvatarFallback>
                  </Avatar>
                  <ChevronDown className="h-3.5 w-3.5 opacity-60" />
                </button>
              </DropdownMenuTrigger>
              <DropdownMenuContent align="end" className="w-56">
                <DropdownMenuLabel>
                  <div className="font-medium">Alex Chen</div>
                  <div className="text-xs font-normal text-muted-foreground">alex@archmind.ai</div>
                </DropdownMenuLabel>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/settings")}>Settings</DropdownMenuItem>
                <DropdownMenuItem onClick={() => navigate("/billing")}>Billing</DropdownMenuItem>
                <DropdownMenuSeparator />
                <DropdownMenuItem onClick={() => navigate("/")}>Sign out</DropdownMenuItem>
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

function NavItem({ to, label, icon: Icon }: { to: string; label: string; icon: any }) {
  return (
    <NavLink
      to={to}
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
