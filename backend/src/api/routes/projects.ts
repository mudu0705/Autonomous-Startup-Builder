import type { FastifyPluginAsync } from 'fastify';
import { ProjectCreateSchema, ProjectUpdateSchema } from '../../../../shared/schemas/index.ts';
import { projectService } from '../../services/project.service.ts';
import { requireAuth } from '../../middleware/auth.middleware.ts';
import { sendSuccess } from '../../utils/response.ts';
import { conversationRoutes } from './conversation.ts';
import { analysisRoutes } from './analysis.ts';
import { orchestrator } from '../../services/orchestrator.service.ts';

export const projectRoutes: FastifyPluginAsync = async (fastify) => {
  // All project routes require valid JWT authentication
  fastify.addHook('preHandler', requireAuth());

  // Mount Smart Guided Intake conversation routes under /:id/conversation
  await fastify.register(conversationRoutes, { prefix: '/:id/conversation' });

  // Mount 9-Agent Analysis & Blueprint routes under /:id
  await fastify.register(analysisRoutes, { prefix: '/:id' });


  /**
   * POST /api/projects/demo
   * Creates an instantly accessible, clearly labeled Demo Sample Project for evaluation.
   */
  fastify.post('/demo', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const demoProject = await projectService.createProject(request.user.userId, {
      name: 'EduGenius AI (Demo / Sample Analysis)',
      startupIdea: 'Automated study and revision schedule generator for engineering students in Maharashtra preparing for university examinations.',
      analysisDepth: 'standard',
    });

    // Seed intake state and complete analysis
    await projectService.updateUserProject(request.user.userId, demoProject.id, {
      proposedSolution: 'A localized WhatsApp & Web platform that converts course syllabus PDFs into daily spaced-repetition revision schedules.',
      targetCustomers: 'Engineering & Polytechnic students in Pune, Mumbai, and Nagpur',
      location: { country: 'India', scope: 'state', locations: ['Maharashtra'] },
      budget: { amount: 500000, currency: 'INR', source: 'USER', isCertain: true },
      revenueModel: 'Semester subscription (₹499/semester) with freemium core tier',
      status: 'READY_FOR_ANALYSIS',
      intakeProgress: 100,
    });

    // Trigger analysis orchestration
    await orchestrator.startOrResumeAnalysis(demoProject.id, request.user.userId);

    const refreshed = await projectService.getUserProjectById(request.user.userId, demoProject.id);
    return sendSuccess(reply, refreshed, 201);
  });

  /**
   * POST /api/projects
   * Creates a new startup project associated with the authenticated user context.
   */
  fastify.post('/', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const input = ProjectCreateSchema.parse(request.body);
    const project = await projectService.createProject(request.user.userId, input);

    return sendSuccess(reply, project, 201);
  });

  /**
   * GET /api/projects
   * Lists all projects belonging strictly to the authenticated user (or all if admin requests all=true).
   */
  fastify.get<{ Querystring: { all?: string } }>('/', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const showAll = request.user.role === 'admin' && request.query?.all === 'true';
    const projects = await projectService.getUserProjects(request.user.userId, request.user.role, showAll);
    return sendSuccess(reply, { projects, count: projects.length }, 200);
  });

  /**
   * GET /api/projects/:id
   * Retrieves single project owned by the authenticated user (or admin).
   */
  fastify.get<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const project = await projectService.getUserProjectById(request.user.userId, request.params.id, request.user.role);
    return sendSuccess(reply, project, 200);
  });

  /**
   * PATCH /api/projects/:id
   * Updates allowed project fields for a project owned by the authenticated user (or admin).
   */
  fastify.patch<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const input = ProjectUpdateSchema.parse(request.body);
    const updatedProject = await projectService.updateUserProject(
      request.user.userId,
      request.params.id,
      input,
      request.user.role
    );

    return sendSuccess(reply, updatedProject, 200);
  });

  /**
   * DELETE /api/projects/:id
   * Deletes a project owned by the authenticated user (or admin).
   */
  fastify.delete<{ Params: { id: string } }>('/:id', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    await projectService.deleteUserProject(request.user.userId, request.params.id, request.user.role);
    return sendSuccess(reply, { message: 'Project deleted successfully' }, 200);
  });
};
