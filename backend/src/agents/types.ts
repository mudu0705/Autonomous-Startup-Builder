import type { AgentId } from '../../../shared/types/agent.ts';

export interface AgentInputPayload {
  projectId: string;
  projectName: string;
  projectDescription: string;
  industry?: string;
  stage: string;
  previousAgentOutputs?: Partial<Record<AgentId, unknown>>;
  researchSources?: Array<{
    title: string;
    url?: string;
    snippet?: string;
  }>;
}

export interface AgentOutputPayload<T = Record<string, unknown>> {
  agentId: AgentId;
  summary: string;
  findings: string[];
  recommendations: string[];
  data: T;
  timestamp: string;
}

export interface AgentContext {
  analysisId: string;
  input: AgentInputPayload;
  signal?: AbortSignal;
}
