import { z } from 'zod';

export const HealthCheckResponseSchema = z.object({
  status: z.enum(['ok', 'degraded', 'error']),
  service: z.string(),
  database: z.enum(['connected', 'disconnected', 'connecting', 'error']),
  timestamp: z.string(),
  version: z.string().optional(),
  uptime: z.number().optional(),
  environment: z.string().optional(),
  diagnostics: z
    .object({
      databaseMessage: z.string().optional(),
      nodeVersion: z.string().optional(),
    })
    .optional(),
});
