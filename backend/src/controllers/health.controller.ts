import type { FastifyRequest, FastifyReply } from 'fastify';
import { databaseService } from '../services/database.ts';
import { aiProviderManager } from '../ai/provider.manager.ts';
import { researchService } from '../research/research.service.ts';
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

export async function getAiHealthHandler(
  _request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  const status = await aiProviderManager.getProviderStatus();
  const researchAvailable = researchService.isAvailable();

  const response = {
    ollama: {
      available: status.ollama.available,
      model: status.ollama.model,
    },
    gemini: {
      available: status.gemini.available,
    },
    research: {
      available: researchAvailable,
    },
    activeProvider: status.activeProvider,
    configuredMode: status.configuredMode,
  };

  reply.status(200).send(response);
}
