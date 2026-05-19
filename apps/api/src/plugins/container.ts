import type { FastifyInstance } from 'fastify';
import fp from 'fastify-plugin';
import { Pool } from 'pg';

import type { AuthRepository } from '../repositories/auth-repository.js';
import { MemoryAuthRepository } from '../repositories/memory-auth-repository.js';
import type { OnboardingRepository } from '../repositories/onboarding-repository.js';
import type { OrganizationRepository } from '../repositories/organization-repository.js';
import { createMemoryStore } from '../repositories/memory-store.js';
import { PostgresAuthRepository } from '../repositories/postgres-auth-repository.js';
import { MemoryOnboardingRepository } from '../repositories/memory-onboarding-repository.js';
import { MemoryOrganizationRepository } from '../repositories/memory-organization-repository.js';
import { MemorySyncRepository } from '../repositories/memory-sync-repository.js';
import { MemoryVoucherClaimRepository } from '../repositories/memory-voucher-claim-repository.js';
import { PostgresSyncRepository } from '../repositories/postgres-sync-repository.js';
import { PostgresVoucherClaimRepository } from '../repositories/postgres-voucher-claim-repository.js';
import { PostgresOnboardingRepository } from '../repositories/postgres-onboarding-repository.js';
import { PostgresOrganizationRepository } from '../repositories/postgres-organization-repository.js';
import { AuthService } from '../services/auth-service.js';
import { ArcaWsfev1Service } from '../services/arca-wsfev1-service.js';
import { OnboardingService } from '../services/onboarding-service.js';
import { OrganizationService } from '../services/organization-service.js';
import { SyncService } from '../services/sync-service.js';
import { VoucherClaimService } from '../services/voucher-claim-service.js';
import { VoucherService } from '../services/voucher-service.js';

declare module 'fastify' {
  interface FastifyInstance {
    authService: AuthService;
    onboardingService: OnboardingService;
    organizationService: OrganizationService;
    syncService: SyncService;
    voucherClaimService: VoucherClaimService;
    voucherService: VoucherService;
  }
}

export const containerPlugin = fp(async (app: FastifyInstance) => {
  let authRepository: AuthRepository;
  let onboardingRepository: OnboardingRepository;
  let repository: OrganizationRepository;
  let syncRepository: MemorySyncRepository | PostgresSyncRepository;
  let voucherClaimRepository: MemoryVoucherClaimRepository | PostgresVoucherClaimRepository;

  if (process.env.DATABASE_URL) {
    const pool = new Pool({
      connectionString: process.env.DATABASE_URL,
    });

    app.addHook('onClose', async () => {
      await pool.end();
    });

    authRepository = new PostgresAuthRepository(pool);
    onboardingRepository = new PostgresOnboardingRepository(pool);
    repository = new PostgresOrganizationRepository(pool);
    syncRepository = new PostgresSyncRepository(pool);
    voucherClaimRepository = new PostgresVoucherClaimRepository(pool);
  } else {
    app.log.warn('DATABASE_URL no configurada; se usa repositorio en memoria');
    const memoryStore = createMemoryStore();
    authRepository = new MemoryAuthRepository(memoryStore);
    onboardingRepository = new MemoryOnboardingRepository(memoryStore);
    repository = new MemoryOrganizationRepository(memoryStore);
    syncRepository = new MemorySyncRepository();
    voucherClaimRepository = new MemoryVoucherClaimRepository();
  }

  app.decorate('authService', new AuthService(authRepository));
  app.decorate('onboardingService', new OnboardingService(onboardingRepository));
  app.decorate('organizationService', new OrganizationService(repository));
  app.decorate('syncService', new SyncService(syncRepository));
  app.decorate('voucherClaimService', new VoucherClaimService(voucherClaimRepository));
  app.decorate('voucherService', new VoucherService(new ArcaWsfev1Service()));
});
