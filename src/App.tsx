import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { BrowserRouter, Route, Routes } from "react-router-dom";
import { Toaster } from "@/components/ui/sonner";
import { TooltipProvider } from "@/components/ui/tooltip";
import { AuthProvider } from "@/contexts/AuthContext";
import { ProtectedRoute } from "@/components/ProtectedRoute";
import Landing from "./pages/Landing";
import Pricing from "./pages/Pricing";
import Contact from "./pages/Contact";
import Privacy from "./pages/legal/Privacy";
import Terms from "./pages/legal/Terms";
import Security from "./pages/legal/Security";
import Login from "./pages/Login";
import Signup from "./pages/Signup";
import AppLayout from "./layouts/AppLayout";
import Dashboard from "./pages/Dashboard";
import Upload from "./pages/Upload";
import Analyses from "./pages/Analyses";
import AnalysisDetail from "./pages/AnalysisDetail";
import Compare from "./pages/Compare";
import Workspaces from "./pages/Workspaces";
import Settings from "./pages/Settings";
import Billing from "./pages/Billing";
import AgentReport from "./pages/AgentReport";
import ExecutiveReport from "./pages/ExecutiveReport";
import Generator from "./pages/Generator";
import Redesign from "./pages/Redesign";
import RiskHeatmap from "./pages/RiskHeatmap";
import DocsGenerator from "./pages/DocsGenerator";
import Simulation from "./pages/Simulation";
import FailureSimulator from "./pages/FailureSimulator";
import Debate from "./pages/Debate";
import Benchmarks from "./pages/Benchmarks";
import ScoreHistory from "./pages/ScoreHistory";
import Integrations from "./pages/Integrations";
import LiveCloud from "./pages/Cloud";
import FinOps from "./pages/FinOps";
import Compliance from "./pages/Compliance";
import PairArchitect from "./pages/PairArchitect";
import WorkspaceDetail from "./pages/WorkspaceDetail";
import ActivityFeed from "./pages/ActivityFeed";
import VersionHistory from "./pages/VersionHistory";
import AuditTrail from "./pages/AuditTrail";
import SharedAnalysis from "./pages/SharedAnalysis";
import ReportBuilder from "./pages/ReportBuilder";
import NotFound from "./pages/NotFound.tsx";

const queryClient = new QueryClient({
  defaultOptions: {
    queries: { staleTime: 30_000, retry: 1 },
  },
});

const App = () => (
  <QueryClientProvider client={queryClient}>
    <AuthProvider>
      <TooltipProvider>
        <Toaster richColors theme="dark" position="top-right" />
        <BrowserRouter>
          <Routes>
            <Route path="/" element={<Landing />} />
            <Route path="/pricing" element={<Pricing />} />
            <Route path="/privacy" element={<Privacy />} />
            <Route path="/terms" element={<Terms />} />
            <Route path="/security" element={<Security />} />
            <Route path="/contact" element={<Contact />} />
            <Route path="/login" element={<Login />} />
            <Route path="/signup" element={<Signup />} />
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
            <Route path="/shared/:token" element={<SharedAnalysis />} />
            <Route path="*" element={<NotFound />} />
          </Routes>
        </BrowserRouter>
      </TooltipProvider>
    </AuthProvider>
  </QueryClientProvider>
);

export default App;
