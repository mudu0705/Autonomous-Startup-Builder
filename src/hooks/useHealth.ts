import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/health.service.ts';
import type { HealthResponse, AIHealthResponse } from '../types/index.ts';

export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [aiData, setAiData] = useState<AIHealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const [health, aiHealth] = await Promise.all([
        healthService.checkHealth().catch(() => null),
        healthService.checkAiHealth().catch(() => null),
      ]);
      if (health) setData(health);
      if (aiHealth) setAiData(aiHealth);
      setLastChecked(new Date());
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'Failed to reach health endpoint';
      setError(message);
    } finally {
      setIsLoading(false);
    }
  }, []);

  useEffect(() => {
    fetchHealth();
  }, [fetchHealth]);

  return {
    data,
    aiData,
    isLoading,
    error,
    lastChecked,
    refetch: fetchHealth,
  };
}
