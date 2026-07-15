import { http, HttpResponse } from "msw";

const API_BASE = "/api";

export const mockAnalysis = {
  id: "test-analysis-1",
  name: "Test Architecture",
  status: "ready",
  scores: {
    scalability: 85,
    security: 70,
    reliability: 75,
    performance: 80,
    cost: 65,
    maintainability: 72,
    observability: 68,
  },
  findings: [
    {
      id: "f1",
      agent: "scalability",
      severity: "high",
      title: "No horizontal scaling",
      summary: "The architecture lacks horizontal scaling capabilities",
      recommendation: "Add auto-scaling group",
      node_id: null,
    },
    {
      id: "f2",
      agent: "security",
      severity: "critical",
      title: "Missing authentication",
      summary: "No auth service detected",
      recommendation: "Add OAuth2 provider",
      node_id: null,
    },
  ],
  diagram_nodes: [
    { id: "n1", data: { label: "Client" }, position: { x: 0, y: 0 } },
    { id: "n2", data: { label: "API" }, position: { x: 200, y: 0 } },
    { id: "n3", data: { label: "DB" }, position: { x: 400, y: 0 } },
  ],
  diagram_edges: [
    { id: "e1", source: "n1", target: "n2" },
    { id: "e2", source: "n2", target: "n3" },
  ],
  diagram_type: "Mermaid",
  workspace_id: "ws-1",
  author_id: "user-1",
  source_type: "paste",
  assessment: null,
  analysis_mode: "review",
  mediator_report: null,
  generation_prompt: null,
  generated_artifacts: null,
};

export const handlers = [
  http.get(`${API_BASE}/analyses`, () => {
    return HttpResponse.json([mockAnalysis]);
  }),

  http.get(`${API_BASE}/analyses/:id`, ({ params }) => {
    const { id } = params;
    if (id === "not-found") {
      return new HttpResponse(null, { status: 404 });
    }
    return HttpResponse.json({ ...mockAnalysis, id });
  }),

  http.post(`${API_BASE}/analyses`, async ({ request }) => {
    const body = (await request.json()) as { name?: string; source_content?: string };
    if (!body?.source_content?.trim()) {
      return HttpResponse.json({ detail: "Diagram content is required" }, { status: 400 });
    }
    return HttpResponse.json({
      ...mockAnalysis,
      id: "new-analysis",
      name: body.name,
      status: "queued",
    });
  }),

  http.post(`${API_BASE}/analyses/:id/chat`, async ({ request }) => {
    const body = (await request.json()) as { message: string };
    return HttpResponse.json({
      id: "chat-1",
      analysis_id: "test-analysis-1",
      role: "assistant",
      content: `Response to: ${body.message}`,
      created_at: new Date().toISOString(),
    });
  }),

  http.get(`${API_BASE}/analyses/agents/meta`, () => {
    return HttpResponse.json([
      { key: "scalability", name: "Scalability", description: "...", accent: "#10b981", icon: "TrendingUp" },
      { key: "security", name: "Security", description: "...", accent: "#ef4444", icon: "ShieldCheck" },
      { key: "reliability", name: "Reliability", description: "...", accent: "#3b82f6", icon: "HeartPulse" },
      { key: "performance", name: "Performance", description: "...", accent: "#f59e0b", icon: "Gauge" },
      { key: "cost", name: "Cost", description: "...", accent: "#8b5cf6", icon: "DollarSign" },
      { key: "maintainability", name: "Maintainability", description: "...", accent: "#ec4899", icon: "Wrench" },
      { key: "observability", name: "Observability", description: "...", accent: "#06b6d4", icon: "Activity" },
    ]);
  }),

  http.get(`${API_BASE}/analyses/:id/agents/:agentKey`, ({ params }) => {
    return HttpResponse.json({
      agent_key: params.agentKey,
      agent_name: "Test Agent",
      agent_description: "Test description",
      agent_accent: "#10b981",
      score: 80,
      findings: mockAnalysis.findings.filter((f) => f.agent === params.agentKey),
      analysis_name: "Test",
      analysis_id: params.id,
      node_count: 3,
      edge_count: 2,
    });
  }),

  http.get(`${API_BASE}/dashboard/stats`, () => {
    return HttpResponse.json({
      total_analyses: 10,
      average_score: 75,
      critical_findings: 2,
      analyses_used: 3,
      analyses_limit: 10,
    });
  }),

  http.get(`${API_BASE}/workspaces`, () => {
    return HttpResponse.json([
      { id: "ws-1", name: "My Workspace", slug: "my-ws", plan: "hobby", member_count: 1, analysis_count: 10 },
    ]);
  }),

  http.get(`${API_BASE}/auth/me`, () => {
    return HttpResponse.json({
      id: "user-1",
      email: "test@example.com",
      full_name: "Test User",
      plan: "hobby",
      analyses_used: 3,
      analyses_limit: 10,
    });
  }),
];
