import type { FastifyPluginAsync } from 'fastify';
import { UserRegistrationRouteSchema, UserLoginSchema } from '../../../../shared/schemas/index.ts';
import { authService } from '../../auth/auth.service.ts';
import { requireAuth } from '../../middleware/auth.middleware.ts';
import { sendSuccess } from '../../utils/response.ts';

export const authRoutes: FastifyPluginAsync = async (fastify) => {
  /**
   * POST /api/auth/register
   * Validates payload with Zod, checks confirmPassword, registers user with Argon2 hash, and returns HTTP 201 with session.
   */
  fastify.post('/register', async (request, reply) => {
    const routeInput = UserRegistrationRouteSchema.parse(request.body);
    const fullName = routeInput.name || routeInput.fullName;

    const session = await authService.register({
      email: routeInput.email,
      password: routeInput.password,
      fullName,
    });

    return sendSuccess(reply, session, 201);
  });

  /**
   * POST /api/auth/login
   * Validates email/password with Zod, authenticates user via AuthService, and returns HTTP 200 with JWT session.
   */
  fastify.post('/login', async (request, reply) => {
    const input = UserLoginSchema.parse(request.body);
    const session = await authService.login(input);

    return sendSuccess(reply, session, 200);
  });

  /**
   * GET /api/auth/me
   * Requires Bearer JWT token, reads user identity from request context, and returns safe user representation.
   */
  fastify.get('/me', { preHandler: [requireAuth()] }, async (request, reply) => {
    if (!request.user) {
      throw new Error('Authenticated user context missing');
    }

    const user = await authService.getCurrentUser(request.user.userId);
    return sendSuccess(reply, { user }, 200);
  });

  /**
   * POST /api/auth/logout
   * Provides a successful logout response for client-side JWT removal.
   */
  fastify.post('/logout', async (_request, reply) => {
    await authService.logout('');
    return sendSuccess(reply, { message: 'Logged out successfully' }, 200);
  });
};
