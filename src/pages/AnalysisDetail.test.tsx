import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import userEvent from '@testing-library/user-event';
import AnalysisDetail from './AnalysisDetail';
import React from 'react';
import '@testing-library/jest-dom';

function renderWithProviders(ui: React.ReactElement) {
  const qc = new QueryClient({
    defaultOptions: {
      queries: { retry: false },
    },
  });

  return render(
    <QueryClientProvider client={qc}>
      <MemoryRouter initialEntries={["/analyses/test-analysis"]}>
        <Routes>
          <Route path="/analyses/:id" element={ui} />
        </Routes>
      </MemoryRouter>
    </QueryClientProvider>
  );
}

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    getAnalysis: vi.fn().mockResolvedValue({
      id: 'test-analysis',
      name: 'Test Analysis',
      status: 'ready',
      workspace: 'Default Workspace',
      author: 'Test User',
      uploaded_at: new Date().toISOString(),
      scores: { cost: 75, scalability: 80, security: 90, reliability: 85 },
      findings: [
        {
          id: 'finding-1',
          agent: 'cost',
          title: 'Cost finding',
          summary: 'This is a cost-related finding.',
          recommendation: 'Consider right-sizing resources.',
          severity: 'high',
        },
      ],
      findings_count: { low: 2, medium: 1, high: 0, critical: 0 },
      diagram_nodes: [],
      diagram_edges: [],
    }),
  },
}));

describe('AnalysisDetail', () => {
  it('renders loading state initially', () => {
    renderWithProviders(<AnalysisDetail />);
    
    expect(screen.getByText('Loading analysis…')).toBeInTheDocument();
  });
  
  it('renders tabs and findings list when data is loaded', async () => {
    renderWithProviders(<AnalysisDetail />);
    
    await waitFor(() => {
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
    });
    
    expect(screen.getByRole('tab', { name: 'Findings' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Debate' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Report' })).toBeInTheDocument();
    expect(screen.getByRole('tab', { name: 'Chat' })).toBeInTheDocument();
  });
  
  it('shows findings in list', async () => {
    renderWithProviders(<AnalysisDetail />);
    
    await waitFor(() => {
      expect(screen.getByText('Cost finding')).toBeInTheDocument();
    });
  });
  
  it('shows error state when analysis fetch fails', async () => {
    const { api } = await import('@/lib/api');
    vi.mocked(api.getAnalysis).mockRejectedValueOnce(new Error('Failed to fetch'));
    
    renderWithProviders(<AnalysisDetail />);
    
    await waitFor(() => {
      expect(screen.getByText('Analysis not found.')).toBeInTheDocument();
    });
  });
});