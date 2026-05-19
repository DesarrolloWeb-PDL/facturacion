import type { FastifyInstance } from 'fastify';

import { bootstrapOnboardingInputSchema, bootstrapOnboardingResponseSchema } from '@facturacion/contracts';

export async function registerOnboardingRoutes(app: FastifyInstance) {
  app.post('/bootstrap', async (request, reply) => {
    try {
      const payload = bootstrapOnboardingInputSchema.parse(request.body satisfies unknown);
      const response = bootstrapOnboardingResponseSchema.parse(await app.onboardingService.bootstrap(payload));
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
}
