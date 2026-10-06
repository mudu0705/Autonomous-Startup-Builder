import type { FastifyRequest, FastifyReply } from 'fastify';
import { logger } from '../config/logger.ts';

export async function requestLoggingHook(request: FastifyRequest): Promise<void> {
  // Avoid spamming logs for frequent static asset polls
  if (request.url.startsWith('/api')) {
    logger.info(`Incoming request: ${request.method} ${request.url}`, {
      ip: request.ip,
      userAgent: request.headers['user-agent'],
    });
  }
}

export async function responseLoggingHook(
  request: FastifyRequest,
  reply: FastifyReply
): Promise<void> {
  if (request.url.startsWith('/api')) {
    logger.info(`Completed request: ${request.method} ${request.url} -> ${reply.statusCode}`, {
      statusCode: reply.statusCode,
      responseTimeMs: Math.round(reply.elapsedTime),
    });
  }
}
