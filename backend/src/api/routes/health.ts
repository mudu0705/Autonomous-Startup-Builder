import type { FastifyPluginAsync } from 'fastify';
import { getHealthHandler } from '../../controllers/health.controller.ts';

export const healthRoutes: FastifyPluginAsync = async (fastify) => {
  fastify.get('/health', getHealthHandler);
};
