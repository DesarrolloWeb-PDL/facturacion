import type { FastifyInstance } from 'fastify';

import { syncBatchInputSchema, syncBatchResponseSchema } from '@facturacion/contracts';

export async function registerSyncRoutes(app: FastifyInstance) {
  app.post('/batch', async (request) => {
    const payload = syncBatchInputSchema.parse(request.body satisfies unknown);
    return syncBatchResponseSchema.parse(await app.syncService.syncBatch(payload));
  });
}