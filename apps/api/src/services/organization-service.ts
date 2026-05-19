import type { CreateOrganizationInput, CreateOrganizationResponse } from '@facturacion/contracts';
import { createOrganizationDraft, createOrganizationId } from '@facturacion/domain';

import type { OrganizationRepository } from '../repositories/organization-repository.js';

export class OrganizationService {
  constructor(private readonly repository: OrganizationRepository) {}

  async create(input: CreateOrganizationInput): Promise<CreateOrganizationResponse> {
    const organization = createOrganizationDraft({
      id: createOrganizationId(),
      legalName: input.legalName,
      cuit: input.cuit,
      ivaConditionCode: input.ivaConditionCode,
      ingresosBrutos: input.ingresosBrutos,
      activityStartDate: input.activityStartDate,
      taxRegime: input.taxRegime,
      environment: input.environment,
      pointsOfSale: input.pointsOfSale,
    });

    const stored = await this.repository.create(organization);

    return {
      organization: {
        ...stored,
      },
    };
  }
}
