import { api } from './api.ts';
import type { HealthResponse, AIHealthResponse } from '../types/index.ts';

export const healthService = {
  checkHealth: async (): Promise<HealthResponse> => {
    return api.get<HealthResponse>('/api/health');
  },
  checkAiHealth: async (): Promise<AIHealthResponse> => {
    return api.get<AIHealthResponse>('/api/health/ai');
  },
};
