import { describe, it, expect, vi } from "vitest";
import { render, screen, fireEvent } from "@testing-library/react";
import { MemoryRouter } from "react-router-dom";
import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import Upload from "../../pages/Upload";

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({ defaultOptions: { queries: { retry: false } } });
  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter>{ui}</MemoryRouter>
    </QueryClientProvider>
  );
}

describe("Upload Page", () => {
  it("renders all three tabs", () => {
    renderWithProviders(<Upload />);
    expect(screen.getByText("Upload")).toBeInTheDocument();
    expect(screen.getByText("Paste code")).toBeInTheDocument();
    expect(screen.getByText("From URL")).toBeInTheDocument();
  });

  it("shows file upload zone on default", () => {
    renderWithProviders(<Upload />);
    expect(screen.getByText(/Drop your architecture/i)).toBeInTheDocument();
  });

  it("switches to paste tab content", () => {
    renderWithProviders(<Upload />);
    fireEvent.click(screen.getByText("Paste code"));
    expect(screen.getByRole("tab", { name: "Paste code" })).toHaveAttribute("data-state", "active");
  });

  it("shows 25 MB max file size note", () => {
    renderWithProviders(<Upload />);
    expect(screen.getByText(/25 MB/i)).toBeInTheDocument();
  });
});
