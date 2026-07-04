import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { server } from '../mocks/server';

// Enable API mocking before tests.
beforeAll(() => server.listen({ onUnhandledRequest: 'error' }));

// Reset any runtime request handlers we may add during the tests.
afterEach(() => server.resetHandlers());

// Disable API mocking after the tests run.
afterAll(() => server.close());

// Custom render function with providers
const queryClient = new QueryClient({
  defaultOptions: {
    queries: {
      retry: false,
    },
  },
});

export const renderWithProviders = (
  ui: React.ReactElement,
  { route = '/' } = {}
) => {
  return render(
    <QueryClientProvider client={queryClient}>
      <MemoryRouter initialEntries={[route]}>
        {ui}
      </MemoryRouter>
    </QueryClientProvider>
  );
};

// Re-export everything from @testing-library/react
export * from '@testing-library/react';
// Override render method
export { renderWithProviders as render };