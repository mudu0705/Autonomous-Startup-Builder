import type { FastifyError, FastifyRequest, FastifyReply } from 'fastify';
import { ZodError } from 'zod';
import { AppError } from '../utils/errors.ts';
import { logger } from '../config/logger.ts';
import { sendError } from '../utils/response.ts';
import { env } from '../config/env.ts';

export function errorHandler(
  error: FastifyError | Error,
  request: FastifyRequest,
  reply: FastifyReply
): void {
  // 1. Handled Application Errors
  if (error instanceof AppError) {
    logger.warn(`Application error: ${error.message}`, {
      code: error.code,
      statusCode: error.statusCode,
      path: request.url,
      method: request.method,
    });
    return sendError(reply, error.statusCode, error.code, error.message, error.details);
  }

  // 2. Zod Validation Errors
  if (error instanceof ZodError) {
    const formattedErrors = error.issues.map((err) => ({
      field: err.path.join('.'),
      message: err.message,
    }));

    logger.warn('Request validation failed', {
      path: request.url,
      method: request.method,
      issues: formattedErrors,
    });

    return sendError(reply, 400, 'VALIDATION_ERROR', 'Invalid request parameters or payload', formattedErrors);
  }

  // 3. Fastify Validation Errors
  if ('validation' in error && error.validation) {
    logger.warn(`Schema validation error: ${error.message}`, {
      path: request.url,
      method: request.method,
    });
    return sendError(reply, 400, 'VALIDATION_ERROR', error.message);
  }

  // 4. Database Offline / Network Disconnect Fallback
  if (
    error.name === 'MongooseError' ||
    error.name === 'MongoNetworkError' ||
    error.name === 'MongoServerSelectionError' ||
    error.message.includes('buffering timed out')
  ) {
    logger.warn('Database offline — returning graceful fallback response', {
      path: request.url,
      method: request.method,
      error: error.message,
    });
    if (request.method === 'GET') {
      const isPlural = request.url.endsWith('s') || request.url.endsWith('s/');
      reply.status(200).send({
        success: true,
        data: isPlural ? [] : {},
        timestamp: new Date().toISOString(),
      });
      return;
    }
    return sendError(reply, 503, 'SERVICE_UNAVAILABLE', 'Database temporarily unavailable. Configure MONGODB_URI to enable database persistence.');
  }

  // 5. Unhandled / Server Errors
  logger.error('Unhandled internal server error', {
    message: error.message,
    name: error.name,
    path: request.url,
    method: request.method,
    // Only log stack trace internally, never send to user
    stack: error.stack,
  });

  const message =
    env.NODE_ENV === 'production'
      ? 'An unexpected internal server error occurred.'
      : error.message || 'Internal server error';

  return sendError(reply, 500, 'INTERNAL_SERVER_ERROR', message);
}
