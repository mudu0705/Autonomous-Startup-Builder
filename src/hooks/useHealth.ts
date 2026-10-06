import { useState, useEffect, useCallback } from 'react';
import { healthService } from '../services/health.service.ts';
import type { HealthResponse } from '../types/index.ts';

export function useHealth() {
  const [data, setData] = useState<HealthResponse | null>(null);
  const [isLoading, setIsLoading] = useState<boolean>(true);
  const [error, setError] = useState<string | null>(null);
  const [lastChecked, setLastChecked] = useState<Date | null>(null);

  const fetchHealth = useCallback(async () => {
    setIsLoading(true);
    setError(null);
    try {
      const response = await healthService.checkHealth();
      setData(response);
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
    isLoading,
    error,
    lastChecked,
    refetch: fetchHealth,
  };
}
