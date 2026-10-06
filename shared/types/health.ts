export type HealthStatus = 'ok' | 'degraded' | 'error';
export type DatabaseStatus = 'connected' | 'disconnected' | 'connecting' | 'error';

export interface HealthResponse {
  status: HealthStatus;
  service: string;
  database: DatabaseStatus;
  timestamp: string;
  version?: string;
  uptime?: number;
  environment?: string;
  diagnostics?: {
    databaseMessage?: string;
    nodeVersion?: string;
  };
}

export interface AIHealthResponse {
  ollama: {
    available: boolean;
    model: string;
  };
  gemini: {
    available: boolean;
  };
  research: {
    available: boolean;
  };
  activeProvider: 'ollama' | 'gemini' | 'none';
  configuredMode?: 'ollama' | 'gemini' | 'auto';
}
