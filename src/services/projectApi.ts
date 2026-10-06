import type { Project } from '../../shared/types/project.ts';
import type { ProjectCreateInput, ProjectUpdateInput } from '../../shared/schemas/index.ts';
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
    'Content-Type': 'application/json',
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
    error: {
      code: 'NETWORK_ERROR',
      message: 'Failed to communicate with project service.',
    },
    timestamp: new Date().toISOString(),
  }));

  if (!json.success) {
    throw new Error(json.error.message || 'An unexpected project API error occurred.');
  }

  return json.data;
}

export const projectApi = {
  createProject: async (input: ProjectCreateInput): Promise<Project> => {
    return await request<Project>('/api/projects', {
      method: 'POST',
      body: JSON.stringify(input),
    });
  },

  getProjects: async (): Promise<{ projects: Project[]; count: number }> => {
    return await request<{ projects: Project[]; count: number }>('/api/projects', {
      method: 'GET',
    });
  },

  getProject: async (id: string): Promise<Project> => {
    return await request<Project>(`/api/projects/${id}`, {
      method: 'GET',
    });
  },

  updateProject: async (id: string, input: ProjectUpdateInput): Promise<Project> => {
    return await request<Project>(`/api/projects/${id}`, {
      method: 'PATCH',
      body: JSON.stringify(input),
    });
  },

  deleteProject: async (id: string): Promise<{ message: string }> => {
    return await request<{ message: string }>(`/api/projects/${id}`, {
      method: 'DELETE',
    });
  },
};
