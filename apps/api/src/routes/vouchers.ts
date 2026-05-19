import type { FastifyInstance } from 'fastify';

import {
  authorizeVoucherInputSchema,
  authorizeVoucherResponseSchema,
  claimVoucherAuthorizationInputSchema,
  claimVoucherAuthorizationResponseSchema,
  releaseVoucherAuthorizationInputSchema,
  releaseVoucherAuthorizationResponseSchema,
} from '@facturacion/contracts';

import { isVoucherServiceError } from '../services/arca-wsfev1-service.js';

export async function registerVoucherRoutes(app: FastifyInstance) {
  app.post('/claim-authorization', async (request, reply) => {
    const payload = claimVoucherAuthorizationInputSchema.parse(request.body satisfies unknown);
    const response = claimVoucherAuthorizationResponseSchema.parse(await app.voucherClaimService.claimAuthorization(payload));

    if (!response.claimGranted) {
      reply.code(409);
    }

    return response;
  });

  app.post('/release-authorization', async (request) => {
    const payload = releaseVoucherAuthorizationInputSchema.parse(request.body satisfies unknown);
    return releaseVoucherAuthorizationResponseSchema.parse(await app.voucherClaimService.releaseAuthorization(payload));
  });

  app.post('/authorize-wsfev1', async (request, reply) => {
    try {
      const payload = authorizeVoucherInputSchema.parse(request.body satisfies unknown);
      const response = authorizeVoucherResponseSchema.parse(await app.voucherService.authorizeWsfev1(payload));
      return response;
    } catch (error) {
      if (isVoucherServiceError(error)) {
        reply.code(error.statusCode);
        return {
          code: error.code,
          message: error.message,
        };
      }

      throw error;
    }
  });
}