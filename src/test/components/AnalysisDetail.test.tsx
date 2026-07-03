import { describe, it, expect, vi } from "vitest";
import { render, screen, waitFor } from "@testing-library/react";
import { MemoryRouter, Route, Routes } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import { AuthContext } from "../../contexts/AuthContext";
import AnalysisDetail from "../../pages/AnalysisDetail";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  const mockAuth = {
    user: { id: "user-1", email: "test@example.com", full_name: "Test User" },
    loading: false,
    signInWithEmail: vi.fn(),
    signUpWithEmail: vi.fn(),
    signInWithOAuth: vi.fn(),
    signOut: vi.fn(),
    refreshProfile: vi.fn(),
  };

  return render(
    <QueryClientProvider client={qc}>
      <AuthContext.Provider value={mockAuth}>
        <MemoryRouter initialEntries={["/analyses/test-analysis-1"]}>
          <Routes>
            <Route path="/analyses/:id" element={ui} />
          </Routes>
        </MemoryRouter>
      </AuthContext.Provider>
    </QueryClientProvider>
  );
}

describe("AnalysisDetail", () => {
  it("renders the analysis name", async () => {
    renderWithProviders(<AnalysisDetail />);
    await waitFor(() => {
      expect(screen.getByText("Test Architecture")).toBeInTheDocument();
    });
  });

  it("renders score cards for all agents", async () => {
    renderWithProviders(<AnalysisDetail />);
    await waitFor(() => {
      expect(screen.getByText("Scalability")).toBeInTheDocument();
      expect(screen.getByText("Security")).toBeInTheDocument();
      expect(screen.getByText("Reliability")).toBeInTheDocument();
    });
  });

  it("renders findings tabs", async () => {
    renderWithProviders(<AnalysisDetail />);
    await waitFor(() => {
      expect(screen.getByText("Findings")).toBeInTheDocument();
    });
  });

  it("shows findings in the findings list", async () => {
    renderWithProviders(<AnalysisDetail />);
    await waitFor(() => {
      expect(screen.getByText("No horizontal scaling")).toBeInTheDocument();
      expect(screen.getByText("Missing authentication")).toBeInTheDocument();
    });
  });

  it("shows export dropdown button", async () => {
    renderWithProviders(<AnalysisDetail />);
    await waitFor(() => {
      expect(screen.getByText("Export")).toBeInTheDocument();
    });
  });
});
