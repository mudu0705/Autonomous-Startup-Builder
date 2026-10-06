import type { FastifyPluginAsync } from 'fastify';
import { adminService } from '../../services/admin.service.ts';
import { requireAuth, requireRole } from '../../middleware/auth.middleware.ts';
import { sendSuccess } from '../../utils/response.ts';

export const adminRoutes: FastifyPluginAsync = async (fastify) => {
  // All admin routes strictly require valid JWT and Admin RBAC role
  fastify.addHook('preHandler', requireAuth());
  fastify.addHook('preHandler', requireRole(['admin']));

  /**
   * GET /api/admin/metrics
   * Retrieves high-level operational counts and average scores.
   */
  fastify.get('/metrics', async (_request, reply) => {
    const metrics = await adminService.getDashboardMetrics();
    return sendSuccess(reply, metrics, 200);
  });

  /**
   * GET /api/admin/users
   * Lists registered platform users.
   */
  fastify.get('/users', async (_request, reply) => {
    const users = await adminService.getUsersList();
    return sendSuccess(reply, { users, count: users.length }, 200);
  });

  /**
   * GET /api/admin/projects
   * Monitors all platform projects and analysis statuses.
   */
  fastify.get('/projects', async (_request, reply) => {
    const projects = await adminService.getProjectsList();
    return sendSuccess(reply, { projects, count: projects.length }, 200);
  });

  /**
   * GET /api/admin/agents
   * Monitors recent agent run durations, statuses, and retry counts.
   */
  fastify.get('/agents', async (_request, reply) => {
    const diagnostics = await adminService.getAgentDiagnostics();
    return sendSuccess(reply, { runs: diagnostics, count: diagnostics.length }, 200);
  });

  /**
   * GET /api/admin/health
   * Deep multi-subsystem operational health checks.
   */
  fastify.get('/health', async (_request, reply) => {
    const health = await adminService.getSystemHealth();
    return sendSuccess(reply, health, 200);
  });

  /**
   * GET /api/admin/logs
   * Retrieves recent audit logs.
   */
  fastify.get('/logs', async (_request, reply) => {
    const logs = await adminService.getRecentLogs();
    return sendSuccess(reply, { logs, count: logs.length }, 200);
  });
};
