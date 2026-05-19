import type { SessionDraft } from '@facturacion/domain';

import type { StoredUser } from './auth-repository.js';
import type { StoredOrganization } from './organization-repository.js';

export type MemoryStore = {
  usersByEmail: Map<string, StoredUser>;
  sessionsById: Map<string, SessionDraft>;
  organizationsById: Map<string, StoredOrganization>;
};

export function createMemoryStore(): MemoryStore {
  return {
    usersByEmail: new Map<string, StoredUser>(),
    sessionsById: new Map<string, SessionDraft>(),
    organizationsById: new Map<string, StoredOrganization>(),
  };
}
