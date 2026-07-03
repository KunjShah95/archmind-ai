import { http, HttpResponse } from 'msw';
import { setupWorker } from 'msw/browser';
import { createMockAnalysis, createMockFinding } from './mockData';

// Mock API endpoints
const API_BASE = 'http://localhost:8000/api';

// Analysis endpoints
export const handlers = [
  http.get(`${API_BASE}/analyses/:id`, ({ params }) => {
    const { id } = params;
    const analysis = createMockAnalysis(id as string);
    return HttpResponse.json(analysis);
  }),
  
  http.get(`${API_BASE}/analyses/:id/findings`, ({ params }) => {
    const { id } = params;
    const findings = [
      createMockFinding(id as string, 'cost', 'high'),
      createMockFinding(id as string, 'scalability', 'medium'),
    ];
    return HttpResponse.json(findings);
  }),
  
  http.post(`${API_BASE}/analyses`, async ({ request }) => {
    const formData = await request.formData();
    const name = formData.get('name') as string;
    const analysis = createMockAnalysis('new-analysis', name);
    return HttpResponse.json(analysis, { status: 201 });
  }),
  
  http.post(`${API_BASE}/pair-architect/session`, async ({ request }) => {
    const body = await request.json();
    return HttpResponse.json({
      ai_reply: "Here's your updated diagram based on your input.",
      updated_mermaid: (body as any).current_mermaid.replace('Client', 'User'),
    });
  }),
  
  http.get(`${API_BASE}/workspaces`, () => {
    return HttpResponse.json([{ id: 'workspace-1', name: 'Default Workspace' }]);
  }),
];

// Export for browser use
export const worker = setupWorker(...handlers);