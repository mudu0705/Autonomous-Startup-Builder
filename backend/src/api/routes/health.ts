import type { FastifyPluginAsync } from 'fastify';
import { getHealthHandler, getAiHealthHandler } from '../../controllers/health.controller.ts';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', getHealthHandler);
  fastify.get('/health/ai', getAiHealthHandler);
};
