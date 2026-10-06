import type { FastifyRequest, FastifyReply } from 'fastify';
import { databaseService } from '../services/database.ts';
import { env } from '../config/env.ts';
import type { HealthResponse } from '../../../shared/types/health.ts';

export async function getHealthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const dbDiagnostics = databaseService.getDiagnostics();
  const dbStatus = dbDiagnostics.status;

  const response: HealthResponse = {
    status: 'ok',
    service: 'autonomous-startup-builder',
    database: dbStatus,
    timestamp: new Date().toISOString(),
    version: '1.0.0-phase1',
    uptime: Math.round(process.uptime()),
    environment: env.NODE_ENV,
    diagnostics: {
      databaseMessage: dbDiagnostics.message,
      nodeVersion: process.version,
    },
  };

  reply.status(200).send(response);
}
