import type { FastifyPluginAsync } from 'fastify';
import { IntakeMessageInputSchema } from '../../../../shared/schemas/intake.schema.ts';
import { conversationService } from '../../services/conversation.service.ts';
import { requireAuth } from '../../middleware/auth.middleware.ts';
import { sendSuccess } from '../../utils/response.ts';

export const conversationRoutes: FastifyPluginAsync = async (fastify) => {
  // All conversation routes require valid JWT authentication
  fastify.addHook('preHandler', requireAuth());

  /**
   * POST /api/projects/:id/conversation/message
   * Submits a user message and returns extracted data, next question, and progress.
   */
  fastify.post<{ Params: { id: string } }>('/message', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const { message } = IntakeMessageInputSchema.parse(request.body);
    const result = await conversationService.handleUserMessage(
      request.params.id,
      request.user.userId,
      message
    );

    return sendSuccess(reply, result, 200);
  });

  /**
   * GET /api/projects/:id/conversation
   * Loads saved conversation history, structured state, and current question.
   */
  fastify.get<{ Params: { id: string } }>('/', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const data = await conversationService.getConversationData(
      request.params.id,
      request.user.userId
    );

    return sendSuccess(reply, data, 200);
  });

  /**
   * POST /api/projects/:id/conversation/reset
   * Resets the conversation and intake state for a project without deleting the project.
   */
  fastify.post<{ Params: { id: string } }>('/reset', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const resetData = await conversationService.resetConversation(
      request.params.id,
      request.user.userId
    );

    return sendSuccess(reply, resetData, 200);
  });

  /**
   * POST /api/projects/:id/conversation/confirm
   * Confirms completed intake and marks project as READY_FOR_ANALYSIS.
   */
  fastify.post<{ Params: { id: string } }>('/confirm', async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const result = await conversationService.confirmIntake(
      request.params.id,
      request.user.userId
    );

    return sendSuccess(reply, result, 200);
  });
};
