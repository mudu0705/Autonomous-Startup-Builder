import type { AgentId, AgentExecutionStatus } from '../../../shared/types/agent.ts';

export interface PipelineExecutionState {
  analysisId: string;
  projectId: string;
  currentStep: number;
  totalSteps: number;
  activeAgent?: AgentId;
  status: AgentExecutionStatus;
  stepResults: Partial<Record<AgentId, unknown>>;
  errors: Array<{ agentId: AgentId; message: string; timestamp: string }>;
}

export interface OrchestratorOptions {
  stopOnError?: boolean;
  maxRetriesPerAgent?: number;
  timeoutMs?: number;
}
