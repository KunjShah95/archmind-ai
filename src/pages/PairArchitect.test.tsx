import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/setup';
import userEvent from '@testing-library/user-event';
import PairArchitect from './PairArchitect';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    runPairArchitectSession: vi.fn().mockResolvedValue({
      ai_reply: "Here's your updated diagram.",
      updated_mermaid: "graph TD\n  User --> Gateway\n  Gateway --> Service",
    }),
  },
}));

describe('PairArchitect', () => {
  it('renders initial message and diagram', () => {
    render(<PairArchitect />);
    
    expect(screen.getByText(/AI Pair Architect/)).toBeInTheDocument();
    expect(screen.getByText(/graph TD/)).toBeInTheDocument();
  });
  
  it('sends message and updates diagram when form is submitted', async () => {
    const user = userEvent.setup();
    render(<PairArchitect />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    await user.type(input, 'Design a notification service');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Here's your updated diagram/)).toBeInTheDocument();
      expect(screen.getByText(/User --> Gateway/)).toBeInTheDocument();
    });
  });
  
  it('shows loading state during API call', async () => {
    vi.mocked(require('@/lib/api').api.runPairArchitectSession).mockImplementationOnce(async () => {
      // Simulate delay
      await new Promise(resolve => setTimeout(resolve, 100));
      return {
        ai_reply: "Here's your updated diagram.",
        updated_mermaid: "graph TD\n  User --> Gateway",
      };
    });
    
    const user = userEvent.setup();
    render(<PairArchitect />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    await user.type(input, 'Design a service');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    
    expect(screen.getByRole('button', { name: /Loading/ })).toBeInTheDocument();
    
    await waitFor(() => {
      expect(screen.queryByRole('button', { name: /Loading/ })).not.toBeInTheDocument();
    });
  });
  
  it('shows error state when API call fails', async () => {
    vi.mocked(require('@/lib/api').api.runPairArchitectSession).mockRejectedValueOnce(new Error('API Error'));
    
    const user = userEvent.setup();
    render(<PairArchitect />);
    
    const input = screen.getByPlaceholderText(/Type your message/);
    await user.type(input, 'Design a service');
    await user.click(screen.getByRole('button', { name: /Send/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Failed to send message/)).toBeInTheDocument();
    });
  });
});