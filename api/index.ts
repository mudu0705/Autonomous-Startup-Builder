import type { IncomingMessage, ServerResponse } from 'node:http';
import { FastifyInstance } from 'fastify';
import { buildApp } from '../backend/src/app.ts';
import { databaseService } from '../backend/src/services/database.ts';
import { logger } from '../backend/src/config/logger.ts';

let appPromise: Promise<FastifyInstance> | null = null;

async function getApp(): Promise<FastifyInstance> {
  if (!appPromise) {
    appPromise = (async () => {
      try {
        await databaseService.connect();
      } catch (err) {
        logger.warn('Vercel serverless: database connection error during initialization', {
          error: err instanceof Error ? err.message : String(err),
        });
      }

      const app = await buildApp();
      await app.ready();
      return app;
    })();
  }

  return appPromise;
}

export default async function handler(req: IncomingMessage, res: ServerResponse) {
  try {
    const app = await getApp();
    app.server.emit('request', req, res);
  } catch (error) {
    logger.error('Unhandled Vercel serverless error', {
      error: error instanceof Error ? error.message : String(error),
    });
    if (!res.headersSent) {
      res.statusCode = 500;
      res.setHeader('Content-Type', 'application/json');
      res.end(
        JSON.stringify({
          success: false,
          error: {
            code: 'INTERNAL_SERVER_ERROR',
            message: 'Serverless invocation error occurred',
          },
          timestamp: new Date().toISOString(),
        })
      );
    }
  }
}
