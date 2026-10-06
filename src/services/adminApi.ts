import { tokenStorage } from './api.ts';

interface ApiResponse<T> {
  success: boolean;
  data: T;
  error?: {
    code: string;
    message: string;
  };
}

async function request<T>(endpoint: string): Promise<T> {
  const token = tokenStorage.get();
  const headers: Record<string, string> = {
    'Content-Type': 'application/json',
  };

  if (token) {
    headers['Authorization'] = `Bearer ${token}`;
  }

  const response = await fetch(endpoint, { headers });
  const json: ApiResponse<T> = await response.json().catch(() => ({
    success: false,
    data: null as unknown as T,
    error: { code: 'NETWORK_ERROR', message: 'Failed to communicate with admin service.' },
  }));

  if (!json.success) {
    throw new Error(json.error?.message || 'Admin operation failed.');
  }

  return json.data;
}

export const adminApi = {
  getMetrics: async () => request<any>('/api/admin/metrics'),
  getUsers: async () => request<{ users: any[]; count: number }>('/api/admin/users'),
  getProjects: async () => request<{ projects: any[]; count: number }>('/api/admin/projects'),
  getAgentDiagnostics: async () => request<{ runs: any[]; count: number }>('/api/admin/agents'),
  getHealth: async () => request<any>('/api/admin/health'),
  getLogs: async () => request<{ logs: any[]; count: number }>('/api/admin/logs'),
};
