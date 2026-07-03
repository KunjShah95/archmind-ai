import { describe, it, expect } from 'vitest';
import { render, screen, waitFor } from '@/test/setup';
import userEvent from '@testing-library/user-event';
import Upload from './Upload';

// Mock the api module
vi.mock('@/lib/api', () => ({
  api: {
    listWorkspaces: vi.fn().mockResolvedValue([{ id: 'workspace-1', name: 'Default Workspace' }]),
    uploadAnalysis: vi.fn().mockResolvedValue({ id: 'new-analysis' }),
    createAnalysis: vi.fn().mockResolvedValue({ id: 'new-analysis' }),
  },
}));

describe('Upload', () => {
  it('renders upload tab by default', () => {
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    expect(screen.getByRole('tab', { name: 'Upload' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByText(/Drag and drop/)).toBeInTheDocument();
  });
  
  it('shows file size guard when file is too large', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    const file = new File(['a'.repeat(26 * 1024 * 1024)], 'large-file.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload files/);
    await user.upload(input, file);
    
    expect(screen.getByText(/File size exceeds/)).toBeInTheDocument();
  });
  
  it('allows file upload when file is within size limit', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    const file = new File(['diagram content'], 'diagram.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload files/);
    await user.upload(input, file);
    
    expect(screen.queryByText(/File size exceeds/)).not.toBeInTheDocument();
    expect(screen.getByText(/diagram.png/)).toBeInTheDocument();
  });
  
  it('submits upload form successfully', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    const file = new File(['diagram content'], 'diagram.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload files/);
    await user.upload(input, file);
    
    await user.type(screen.getByLabelText(/Analysis name/), 'Test Analysis');
    await user.click(screen.getByRole('button', { name: /Analyze/ }));
    
    await waitFor(() => {
      expect(require('@/lib/api').api.uploadAnalysis).toHaveBeenCalled();
    });
  });
  
  it('shows error when upload fails', async () => {
    vi.mocked(require('@/lib/api').api.uploadAnalysis).mockRejectedValueOnce(new Error('Upload failed'));
    
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    const file = new File(['diagram content'], 'diagram.png', { type: 'image/png' });
    const input = screen.getByLabelText(/Upload files/);
    await user.upload(input, file);
    
    await user.type(screen.getByLabelText(/Analysis name/), 'Test Analysis');
    await user.click(screen.getByRole('button', { name: /Analyze/ }));
    
    await waitFor(() => {
      expect(screen.getByText(/Upload failed/)).toBeInTheDocument();
    });
  });
  
  it('switches to paste tab when clicked', async () => {
    const user = userEvent.setup();
    render(
      <MemoryRouter>
        <Upload />
      </MemoryRouter>
    );
    
    await user.click(screen.getByRole('tab', { name: 'Paste' }));
    expect(screen.getByRole('tab', { name: 'Paste' })).toHaveAttribute('data-state', 'active');
    expect(screen.getByPlaceholderText(/Paste your diagram/)).toBeInTheDocument();
  });
});