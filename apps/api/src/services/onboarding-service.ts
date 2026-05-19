import type { BootstrapOnboardingInput, BootstrapOnboardingResponse } from '@facturacion/contracts';
import {
  createOrganizationDraft,
  createOrganizationId,
  createSessionId,
  createSessionToken,
  createUserId,
} from '@facturacion/domain';

import type { OnboardingRepository } from '../repositories/onboarding-repository.js';
import { hashPassword } from './password-service.js';

export class OnboardingService {
  constructor(private readonly repository: OnboardingRepository) {}

  async bootstrap(input: BootstrapOnboardingInput): Promise<BootstrapOnboardingResponse> {
    const existing = await this.repository.findUserByEmail(input.user.email);

    if (existing) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const userId = createUserId();
    const organizationId = createOrganizationId();

    const result = await this.repository.bootstrap({
      user: {
        id: userId,
        email: input.user.email,
        fullName: input.user.fullName,
        passwordHash: hashPassword(input.user.password),
      },
      session: {
        id: createSessionId(),
        userId,
        token: createSessionToken(),
        expiresAt: createExpirationDate(),
      },
      organization: createOrganizationDraft({
        id: organizationId,
        legalName: input.organization.legalName,
        cuit: input.organization.cuit,
        ivaConditionCode: input.organization.ivaConditionCode,
        ingresosBrutos: input.organization.ingresosBrutos,
        activityStartDate: input.organization.activityStartDate,
        taxRegime: input.organization.taxRegime,
        environment: input.organization.environment,
        pointsOfSale: input.organization.pointsOfSale,
      }),
      membership: {
        roleCode: 'owner',
      },
    });

    return {
      user: {
        id: result.user.id,
        email: result.user.email,
        fullName: result.user.fullName,
        createdAt: result.user.createdAt,
      },
      session: {
        token: result.session.token,
        expiresAt: result.session.expiresAt,
      },
      organization: {
        ...result.organization,
      },
      membership: result.membership,
    };
  }
}

function createExpirationDate() {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);
  return expiration.toISOString();
}
