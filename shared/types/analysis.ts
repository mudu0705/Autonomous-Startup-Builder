import { AgentId } from './agent.ts';

export type AnalysisStatus = 'draft' | 'in_progress' | 'completed' | 'failed' | 'cancelled';

export interface Analysis {
  id: string;
  projectId: string;
  version: number;
  status: AnalysisStatus;
  currentAgent?: AgentId;
  progressPercent: number;
  createdAt: string;
  updatedAt: string;
}
