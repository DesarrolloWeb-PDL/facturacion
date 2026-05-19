import type { FastifyInstance } from 'fastify';

import {
  createOrganizationInputSchema,
  createOrganizationResponseSchema,
} from '@facturacion/contracts';

export async function registerOrganizationRoutes(app: FastifyInstance) {
  app.post('/', async (request, reply) => {
    const payload = createOrganizationInputSchema.parse(request.body satisfies unknown);
    const response = createOrganizationResponseSchema.parse(await app.organizationService.create(payload));

    reply.code(201);
    return response;
  });
}
