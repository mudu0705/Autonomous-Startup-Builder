import { api } from './api.ts';
import type { HealthResponse } from '../types/index.ts';

export const healthService = {
  checkHealth: async (): Promise<HealthResponse> => {
    return api.get<HealthResponse>('/health');
  },
};
