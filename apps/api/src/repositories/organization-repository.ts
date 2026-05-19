import type { OrganizationDraft } from '@facturacion/domain';

export type StoredOrganization = OrganizationDraft & {
  createdAt: string;
};

export interface OrganizationRepository {
  create(input: OrganizationDraft): Promise<StoredOrganization>;
}
