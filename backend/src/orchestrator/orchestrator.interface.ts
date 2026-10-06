import type { PipelineExecutionState, OrchestratorOptions } from './types.ts';

export interface IOrchestrator {
  startAnalysis(projectId: string, options?: OrchestratorOptions): Promise<PipelineExecutionState>;
  getAnalysisState(analysisId: string): Promise<PipelineExecutionState | null>;
  cancelAnalysis(analysisId: string): Promise<boolean>;
  retryFailedStep(analysisId: string): Promise<PipelineExecutionState>;
}
