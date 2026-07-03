import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@testing-library/react';
import userEvent from '@testing-library/user-event';
import { MemoryRouter, Route, Routes } from 'react-router-dom';
import AnalysisDetail from './AnalysisDetail';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    getAnalysis: vi.fn().mockResolvedValue({
      id: 'test-analysis',
      name: 'Test Analysis',
      status: 'ready',
      score: 75,
      findings_count: { low: 2, medium: 1, high: 0, critical: 0 },
    }),
    getFindings: vi.fn().mockResolvedValue([
      {
        id: 'finding-1',
        agent: 'cost',
        title: 'Cost finding',
        description: 'This is a cost-related finding.',
        severity: 'high',
      },
    ]),
  },
}));

describe('AnalysisDetail', () => {
  it('renders loading state initially', () => {
    render(
      <MemoryRouter initialEntries={['/analyses/test-analysis']}>
        <Routes>
          <Route path="/analyses/:id" element={<AnalysisDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    expect(screen.getByRole('status')).toBeInTheDocument();
  });
  
  it('renders tabs and findings list when data is loaded', async () => {
    render(
      <MemoryRouter initialEntries={['/analyses/test-analysis']}>
        <Routes>
          <Route path="/analyses/:id" element={<AnalysisDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Findings' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Diagram' })).toBeInTheDocument();
      expect(screen.getByRole('tab', { name: 'Executive Report' })).toBeInTheDocument();
    });
  });
  
  it('switches tabs when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter initialEntries={['/analyses/test-analysis']}>
        <Routes>
          <Route path="/analyses/:id" element={<AnalysisDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText('Test Analysis')).toBeInTheDocument();
    });
    
    await user.click(screen.getByRole('tab', { name: 'Diagram' }));
    expect(screen.getByText(/graph TD/)).toBeInTheDocument();
    
    await user.click(screen.getByRole('tab', { name: 'Executive Report' }));
    expect(screen.getByText(/Mediator Report/)).toBeInTheDocument();
  });
  
  it('shows error state when analysis fetch fails', async () => {
    vi.mocked(require('@/lib/api').api.getAnalysis).mockRejectedValueOnce(new Error('Failed to fetch'));
    
    render(
      <MemoryRouter initialEntries={['/analyses/test-analysis']}>
        <Routes>
          <Route path="/analyses/:id" element={<AnalysisDetail />} />
        </Routes>
      </MemoryRouter>
    );
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to load analysis/)).toBeInTheDocument();
    });
  });
});