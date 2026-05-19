import type { FastifyInstance } from 'fastify';

import {
  loginInputSchema,
  loginResponseSchema,
  registerUserInputSchema,
  registerUserResponseSchema,
} from '@facturacion/contracts';

export async function registerAuthRoutes(app: FastifyInstance) {
  app.post('/register', async (request, reply) => {
    try {
      const payload = registerUserInputSchema.parse(request.body satisfies unknown);
      const response = registerUserResponseSchema.parse(await app.authService.register(payload));
      reply.code(201);
      return response;
    } catch (error) {
      if (error instanceof Error && error.message === 'EMAIL_ALREADY_REGISTERED') {
        reply.code(409);
        return { code: 'EMAIL_ALREADY_REGISTERED' };
      }

      throw error;
    }
  });

  app.post('/login', async (request, reply) => {
    try {
      const payload = loginInputSchema.parse(request.body satisfies unknown);
      return loginResponseSchema.parse(await app.authService.login(payload));
    } catch (error) {
      if (error instanceof Error && error.message === 'INVALID_CREDENTIALS') {
        reply.code(401);
        return { code: 'INVALID_CREDENTIALS' };
      }

      throw error;
    }
  });
}
