import cors from '@fastify/cors';
import Fastify from 'fastify';

import { containerPlugin } from './plugins/container.js';
import { registerAuthRoutes } from './routes/auth.js';
import { registerHealthRoutes } from './routes/health.js';
import { registerOnboardingRoutes } from './routes/onboarding.js';
import { registerOrganizationRoutes } from './routes/organizations.js';
import { registerSyncRoutes } from './routes/sync.js';
import { registerVoucherRoutes } from './routes/vouchers.js';

export async function buildApp() {
  const app = Fastify({
    logger: true,
  });

  await app.register(cors, {
    origin: ['http://localhost:3000', 'http://127.0.0.1:3000'],
    credentials: false,
  });

  app.register(containerPlugin);
  app.register(registerAuthRoutes, { prefix: '/auth' });
  app.register(registerHealthRoutes, { prefix: '/health' });
  app.register(registerOnboardingRoutes, { prefix: '/onboarding' });
  app.register(registerOrganizationRoutes, { prefix: '/organizations' });
  app.register(registerSyncRoutes, { prefix: '/sync' });
  app.register(registerVoucherRoutes, { prefix: '/vouchers' });

  return app;
}
