import type { Analysis, Finding } from '@/lib/api';

export const createMockAnalysis = (id: string, name?: string): Analysis => ({
  id,
  name: name || `Analysis ${id}`,
  status: 'ready',
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  workspace_id: 'workspace-1',
  author_id: 'user-1',
  diagram_url: '',
  score: 75,
  findings_count: { low: 2, medium: 1, high: 0, critical: 0 },
  agent_meta: {},
  error_code: null,
  error_message: null,
  failed_step: null,
});

export const createMockFinding = (analysisId: string, agent: string, severity: string): Finding => ({
  id: `${analysisId}-${agent}-${severity}`,
  analysis_id: analysisId,
  agent: agent as any,
  title: `${agent} finding`,
  description: `This is a ${severity} severity finding from the ${agent} agent.`,
  severity: severity as any,
  start_line: null,
  end_line: null,
  created_at: new Date().toISOString(),
  updated_at: new Date().toISOString(),
  score: 75,
  confidence: 0.9,
  tags: [],
  context: {},
});