import type {
  IntakeMessageResponse,
  IntakeConversationData,
} from '../../shared/types/intake.ts';
import { tokenStorage } from './api.ts';

interface ApiResponseSuccess<T> {
  success: true;
  data: T;
  timestamp: string;
}

interface ApiResponseError {
  success: false;
  error: {
    code: string;
    message: string;
    details?: unknown;
  };
  timestamp: string;
}

type ApiResponse<T> = ApiResponseSuccess<T> | ApiResponseError;

async function request<T>(endpoint: string, options: RequestInit = {}): Promise<T> {
  const token = tokenStorage.get();

  const headers: Record<string, string> = {
    ...(options.headers as Record<string, string>),
  };

  if (options.body !== undefined && options.body !== '') {
    headers['Content-Type'] = headers['Content-Type'] || 'application/json';
  } else {
    delete headers['Content-Type'];
    delete headers['content-type'];
  }

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, {
    ...options,
    headers,
  });

  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    error: {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with the intake service.',
    },
    timestamp: new Date().toISOString(),
  }));

  if (!json.success) {
    throw new Error(json.error.message || 'An unexpected intake API error occurred.');
  }

  return json.data;
}

export const intakeApi = {
  /**
   * Submits user natural language input for guided extraction and receives updated structured state.
   */
  sendMessage: async (projectId: string, message: string): Promise<IntakeMessageResponse> => {
    return await request<IntakeMessageResponse>(`/api/projects/${projectId}/conversation/message`, {
      method: 'POST',
      body: JSON.stringify({ message }),
    });
  },

  /**
   * Retrieves saved intake conversation history, structured state, and current question.
   */
  getConversation: async (projectId: string): Promise<IntakeConversationData> => {
    return await request<IntakeConversationData>(`/api/projects/${projectId}/conversation`, {
      method: 'GET',
    });
  },

  /**
   * Resets the intake conversation and restarts the guided questions for the project.
   */
  resetConversation: async (projectId: string): Promise<IntakeConversationData> => {
    return await request<IntakeConversationData>(`/api/projects/${projectId}/conversation/reset`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },

  /**
   * Confirms project intake and marks it ready for analysis (without starting Phase 3 agents).
   */
  confirmIntake: async (projectId: string): Promise<{ success: boolean; status: string }> => {
    return await request<{ success: boolean; status: string }>(`/api/projects/${projectId}/conversation/confirm`, {
      method: 'POST',
      body: JSON.stringify({}),
    });
  },
};
