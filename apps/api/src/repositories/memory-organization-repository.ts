import type { OrganizationDraft } from '@facturacion/domain';

import type { OrganizationRepository, StoredOrganization } from './organization-repository.js';
import type { MemoryStore } from './memory-store.js';

export class MemoryOrganizationRepository implements OrganizationRepository {
  constructor(private readonly store: MemoryStore) {}

  async create(input: OrganizationDraft): Promise<StoredOrganization> {
    const stored: StoredOrganization = {
      ...input,
      pointsOfSale: [...input.pointsOfSale],
      createdAt: new Date().toISOString(),
    };

    this.store.organizationsById.set(stored.id, stored);
    return stored;
  }
}
