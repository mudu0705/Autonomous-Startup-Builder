import type {
  AnalysisResults,
  AgentId,
  AgentExecutionStatus,
} from '../../shared/types/agent.ts';
import type {
  ScenarioComparison,
  ScenarioAssumptionChanges,
  ScenarioType,
} from '../../shared/types/scenario.ts';
import type { StartupBlueprint } from '../../shared/types/report.ts';
import { tokenStorage } from './api.ts';

export interface AnalysisStatusResponse {
  analysisId: string | null;
  status: string;
  progressPercent: number;
  currentAgent?: string;
  agents: Array<{
    id: AgentId;
    name: string;
    status: AgentExecutionStatus;
    score?: number;
    durationMs?: number;
    error?: string;
  }>;
}

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
    details?: unknown;
  };
}

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    ...(options.body !== undefined ? { 'Content-Type': 'application/json' } : {}),
    ...(options.headers as Record<string, string>),
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with analysis service.',
    },
  }));

  if (!json.success) {
    throw new Error(json.error?.message || 'An unexpected analysis API error occurred.');
  }

  return json.data;
}

export const analysisApi = {
  /**
   * Triggers or resumes the 9-agent analysis pipeline for a project.
   */
  startAnalysis: async (projectId: string): Promise<{ analysisId: string; status: string }> => {
    return await request<{ analysisId: string; status: string }>(`/api/projects/${projectId}/analyze`, {
      method: 'POST',
    });
  },

  /**
   * Polls the live execution status and agent cards.
   */
  getStatus: async (projectId: string): Promise<AnalysisStatusResponse> => {
    return await request<AnalysisStatusResponse>(`/api/projects/${projectId}/status`, {
      method: 'GET',
    });
  },

  /**
   * Retrieves final completed 9-agent results, scores, and sources.
   */
  getResults: async (projectId: string): Promise<AnalysisResults> => {
    return await request<AnalysisResults>(`/api/projects/${projectId}/results`, {
      method: 'GET',
    });
  },

  /**
   * Simulates a What-If scenario against the project baseline.
   */
  createScenario: async (
    projectId: string,
    params: {
      title?: string;
      scenarioType?: ScenarioType;
      changes: ScenarioAssumptionChanges;
    }
  ): Promise<ScenarioComparison> => {
    return await request<ScenarioComparison>(`/api/projects/${projectId}/scenarios`, {
      method: 'POST',
      body: JSON.stringify(params),
    });
  },

  /**
   * Lists all saved What-If scenarios.
   */
  getScenarios: async (projectId: string): Promise<any[]> => {
    return await request<any[]>(`/api/projects/${projectId}/scenarios`, {
      method: 'GET',
    });
  },

  /**
   * Retrieves the 26-section consolidated Startup Blueprint.
   */
  getBlueprint: async (projectId: string): Promise<StartupBlueprint> => {
    return await request<StartupBlueprint>(`/api/projects/${projectId}/report`, {
      method: 'GET',
    });
  },

  /**
   * Returns direct browser URL for printable PDF export.
   */
  getPdfUrl: (projectId: string): string => {
    return `/api/projects/${projectId}/report/pdf`;
  },
};
