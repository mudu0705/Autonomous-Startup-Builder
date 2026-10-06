import type { FastifyPluginAsync } from 'fastify';
import { healthRoutes } from './health.ts';
import { authRoutes } from './auth.ts';
import { projectRoutes } from './projects.ts';
import { adminRoutes } from './admin.ts';

export const apiRoutes: FastifyPluginAsync = async (fastify) => {
  // Register health route under /api/health
  await fastify.register(healthRoutes);

  // Register auth routes under /api/auth
  await fastify.register(authRoutes, { prefix: '/auth' });

  // Register project routes under /api/projects
  await fastify.register(projectRoutes, { prefix: '/projects' });

  // Register admin monitoring routes under /api/admin
  await fastify.register(adminRoutes, { prefix: '/admin' });
};
