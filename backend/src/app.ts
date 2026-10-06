import Fastify, { FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import { apiRoutes } from './api/routes/index.ts';
import { errorHandler } from './middleware/error.middleware.ts';
import { requestLoggingHook, responseLoggingHook } from './middleware/logging.middleware.ts';
import { logger } from './config/logger.ts';

export async function buildApp(): Promise<FastifyInstance> {
  const app = Fastify({
    logger: false, // We use structured custom logger via hooks for sanitization
    disableRequestLogging: true,
  });

  // 1. Configure CORS
  await app.register(cors, {
    origin: (origin, cb) => {
      // Allow localhost, dev previews, or server-to-server calls
      cb(null, true);
    },
    methods: ['GET', 'POST', 'PUT', 'PATCH', 'DELETE', 'OPTIONS'],
    allowedHeaders: ['Content-Type', 'Authorization', 'X-Requested-With'],
    credentials: true,
  });

  // 2. Request & Response Lifecycle Logging Hooks
  app.addHook('onRequest', requestLoggingHook);
  app.addHook('onResponse', responseLoggingHook);

  // 3. Centralized Error Handling
  app.setErrorHandler(errorHandler);

  // 4. Register API Routes under /api prefix
  await app.register(apiRoutes, { prefix: '/api' });

  logger.info('Fastify application built and configured successfully.');

  return app;
}
