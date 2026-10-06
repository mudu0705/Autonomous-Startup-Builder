import type { FastifyRequest, FastifyReply } from 'fastify';
import { z } from 'zod';

interface ValidationSchemas {
  body?: z.ZodTypeAny;
  query?: z.ZodTypeAny;
  params?: z.ZodTypeAny;
}

/**
 * Reusable preValidation hook for Fastify routes using Zod schemas
 */
export function validateRequest(schemas: ValidationSchemas) {
  return async (request: FastifyRequest, _reply: FastifyReply): Promise<void> => {
    if (schemas.body && request.body !== undefined) {
      request.body = await schemas.body.parseAsync(request.body);
    }
    if (schemas.query && request.query !== undefined) {
      request.query = await schemas.query.parseAsync(request.query);
    }
    if (schemas.params && request.params !== undefined) {
      request.params = await schemas.params.parseAsync(request.params);
    }
  };
}
