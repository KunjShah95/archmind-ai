import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import PairArchitect from "../../pages/PairArchitect";

function renderWithProviders() {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>
        <PairArchitect />
      </MemoryRouter>
    </QueryClientProvider>
  );
}

describe("PairArchitect", () => {
  it("renders the chat input with placeholder", () => {
    renderWithProviders();
    expect(screen.getByPlaceholderText(/Suggest a database/i)).toBeInTheDocument();
  });

  it("renders the Mermaid preview area heading", () => {
    renderWithProviders();
    expect(screen.getByText(/Iterative Blueprint \(Mermaid\)/i)).toBeInTheDocument();
  });

  it("shows AI Pair Architect title on load", () => {
    renderWithProviders();
    expect(screen.getByText("AI Pair Architect")).toBeInTheDocument();
  });

  it("updates input value on typing", () => {
    renderWithProviders();
    const input = screen.getByPlaceholderText(/Suggest a database/i);
    fireEvent.change(input, { target: { value: "Add a database" } });
    expect(input).toHaveValue("Add a database");
  });
});
