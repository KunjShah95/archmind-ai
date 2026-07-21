/* eslint-disable react-refresh/only-export-components -- test-utility module: re-exports helpers/testing-library, not a React fast-refresh boundary */
import '@testing-library/jest-dom';
import { QueryClient, QueryClientProvider } from '@tanstack/react-query';
import { render } from '@testing-library/react';
import { MemoryRouter } from 'react-router-dom';
import React from 'react';
import { server } from '../mocks/server';

// jsdom lacks several DOM APIs that Radix UI and scroll-based components call at
// runtime. Polyfill them so component tests exercise real behavior instead of crashing.
if (!Element.prototype.scrollIntoView) {
  Element.prototype.scrollIntoView = () => {};
}
if (!Element.prototype.hasPointerCapture) {
  Element.prototype.hasPointerCapture = () => false;
}
if (!Element.prototype.releasePointerCapture) {
  Element.prototype.releasePointerCapture = () => {};
}
if (!Element.prototype.scrollTo) {
  Element.prototype.scrollTo = () => {};
}
if (typeof globalThis.ResizeObserver === 'undefined') {
  globalThis.ResizeObserver = class {
    observe() {}
    unobserve() {}
    disconnect() {}
  };
}
// jsdom's AbortSignal lacks the static `timeout` helper that the API client uses
// to bound every request. Polyfill it so request-layer tests exercise real code.
if (typeof AbortSignal !== 'undefined' && typeof AbortSignal.timeout !== 'function') {
  AbortSignal.timeout = (ms: number) => {
    const controller = new AbortController();
    setTimeout(
      () => controller.abort(new DOMException('The operation timed out.', 'TimeoutError')),
      ms,
    );
    return controller.signal;
  };
}

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