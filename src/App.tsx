import React, { Suspense, lazy, useState, useEffect } from "react";
import type { ErrorInfo } from "react";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";

// Static imports — needed immediately on first load
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import About from "./pages/About";
import Careers from "./pages/Careers";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Security from "./pages/legal/Security";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import NotFound from "./pages/NotFound.tsx";

// Lazy imports — code-split for better initial load performance
const Upload = lazy(() => import("./pages/Upload"));
const Analyses = lazy(() => import("./pages/Analyses"));
const AnalysisDetail = lazy(() => import("./pages/AnalysisDetail"));
const Compare = lazy(() => import("./pages/Compare"));
const Workspaces = lazy(() => import("./pages/Workspaces"));
const Settings = lazy(() => import("./pages/Settings"));
const Billing = lazy(() => import("./pages/Billing"));
const AgentReport = lazy(() => import("./pages/AgentReport"));
const ExecutiveReport = lazy(() => import("./pages/ExecutiveReport"));
const Generator = lazy(() => import("./pages/Generator"));
const Redesign = lazy(() => import("./pages/Redesign"));
const RiskHeatmap = lazy(() => import("./pages/RiskHeatmap"));
const DocsGenerator = lazy(() => import("./pages/DocsGenerator"));
const Simulation = lazy(() => import("./pages/Simulation"));
const FailureSimulator = lazy(() => import("./pages/FailureSimulator"));
const Debate = lazy(() => import("./pages/Debate"));
const Benchmarks = lazy(() => import("./pages/Benchmarks"));
const ScoreHistory = lazy(() => import("./pages/ScoreHistory"));
const Integrations = lazy(() => import("./pages/Integrations"));
const LiveCloud = lazy(() => import("./pages/Cloud"));
const FinOps = lazy(() => import("./pages/FinOps"));
const Compliance = lazy(() => import("./pages/Compliance"));
const PairArchitect = lazy(() => import("./pages/PairArchitect"));
const WorkspaceDetail = lazy(() => import("./pages/WorkspaceDetail"));
const ActivityFeed = lazy(() => import("./pages/ActivityFeed"));
const VersionHistory = lazy(() => import("./pages/VersionHistory"));
const AuditTrail = lazy(() => import("./pages/AuditTrail"));
const SharedAnalysis = lazy(() => import("./pages/SharedAnalysis"));
const ReportBuilder = lazy(() => import("./pages/ReportBuilder"));

// ─── Error Boundary ───────────────────────────────────────────────────────────

interface ErrorBoundaryState {
  hasError: boolean;
  error: Error | null;
}

class RouteErrorBoundary extends React.Component<
  React.PropsWithChildren<object>,
  ErrorBoundaryState
> {
  constructor(props: React.PropsWithChildren<object>) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): ErrorBoundaryState {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, info: ErrorInfo) {
    console.error("RouteErrorBoundary caught an error:", error, info);
  }

  render() {
    if (this.state.hasError) {
      return (
        <div className="flex flex-col items-center justify-center h-screen bg-background text-foreground gap-4">
          <h1 className="text-2xl font-bold">Something went wrong</h1>
          <p className="text-muted-foreground text-sm max-w-md text-center">
            {this.state.error?.message ?? "An unexpected error occurred."}
          </p>
          <button
            className="px-4 py-2 rounded bg-primary text-primary-foreground hover:bg-primary/90"
            onClick={() => window.location.reload()}
          >
            Reload page
          </button>
        </div>
      );
    }
    return this.props.children;
  }
}

// ─── Suspense fallback ────────────────────────────────────────────────────────

const PageLoader = (
  <div className="flex items-center justify-center h-screen bg-background">
    <div className="animate-spin rounded-full h-8 w-8 border-b-2 border-primary" />
  </div>
);

// ─── Query client ─────────────────────────────────────────────────────────────

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

// ─── Themed Toaster ───────────────────────────────────────────────────────────

function ThemedToaster() {
  const [theme, setTheme] = useState<"light" | "dark">(
    () => (document.documentElement.classList.contains("dark") ? "dark" : "light")
  );
  useEffect(() => {
    const obs = new MutationObserver(() =>
      setTheme(document.documentElement.classList.contains("dark") ? "dark" : "light")
    );
    obs.observe(document.documentElement, { attributes: true, attributeFilter: ["class"] });
    return () => obs.disconnect();
  }, []);
  return <Toaster richColors theme={theme} position="top-right" />;
}

// ─── App ──────────────────────────────────────────────────────────────────────

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <ThemedToaster />
        <BrowserRouter future={{ v7_startTransition: true, v7_relativeSplatPath: true }}>
          <RouteErrorBoundary>
            <Suspense fallback={PageLoader}>
              <Routes>
                {/* Public static routes */}
                <Route path="/" element={<Landing />} />
                <Route path="/pricing" element={<Pricing />} />
                <Route path="/privacy" element={<Privacy />} />
                <Route path="/terms" element={<Terms />} />
                <Route path="/security" element={<Security />} />
                <Route path="/contact" element={<Contact />} />
                <Route path="/about" element={<About />} />
                <Route path="/careers" element={<Careers />} />
                <Route path="/login" element={<Login />} />
                <Route path="/signup" element={<Signup />} />

                {/* Protected lazy routes */}
                <Route
                  element={
                    <ProtectedRoute>
                      <AppLayout />
                    </ProtectedRoute>
                  }
                >
                  <Route path="/dashboard" element={<Dashboard />} />
                  <Route path="/generate" element={<Generator />} />
                  <Route path="/upload" element={<Upload />} />
                  <Route path="/analyses" element={<Analyses />} />
                  <Route path="/analyses/:id" element={<AnalysisDetail />} />
                  <Route path="/analyses/:id/agents/:agentKey" element={<AgentReport />} />
                  <Route path="/analyses/:id/report" element={<ExecutiveReport />} />
                  <Route path="/analyses/:id/redesign" element={<Redesign />} />
                  <Route path="/analyses/:id/docs" element={<DocsGenerator />} />
                  <Route path="/analyses/:id/heatmap" element={<RiskHeatmap />} />
                  <Route path="/compare" element={<Compare />} />
                  <Route path="/workspaces" element={<Workspaces />} />
                  <Route path="/settings" element={<Settings />} />
                  <Route path="/billing" element={<Billing />} />

                  {/* Phase 2 Routes */}
                  <Route path="/simulate" element={<Simulation />} />
                  <Route path="/chaos" element={<FailureSimulator />} />
                  <Route path="/debate" element={<Debate />} />
                  <Route path="/benchmarks" element={<Benchmarks />} />
                  <Route path="/score-history" element={<ScoreHistory />} />

                  {/* Phase 3 Routes */}
                  <Route path="/integrations" element={<Integrations />} />

                  {/* Phase 4 Routes */}
                  <Route path="/cloud" element={<LiveCloud />} />
                  <Route path="/finops" element={<FinOps />} />
                  <Route path="/compliance" element={<Compliance />} />
                  <Route path="/pair-architect" element={<PairArchitect />} />

                  {/* Phase 3B Routes */}
                  <Route path="/workspaces/:wsId" element={<WorkspaceDetail />} />
                  <Route path="/workspaces/:wsId/activity" element={<ActivityFeed />} />
                  <Route path="/analyses/:id/history" element={<VersionHistory />} />
                  <Route path="/analyses/:id/audit" element={<AuditTrail />} />
                  <Route path="/analyses/:id/report-builder" element={<ReportBuilder />} />
                </Route>

                {/* Public lazy route */}
                <Route path="/shared/:token" element={<SharedAnalysis />} />

                {/* Static 404 */}
                <Route path="*" element={<NotFound />} />
              </Routes>
            </Suspense>
          </RouteErrorBoundary>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
