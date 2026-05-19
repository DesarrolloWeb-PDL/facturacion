import type { OrganizationDraft, SessionDraft } from '@facturacion/domain';

import type { StoredOrganization } from './organization-repository.js';
import type { StoredUser } from './auth-repository.js';

export type BootstrapDraft = {
  user: {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
  };
  session: SessionDraft;
  organization: OrganizationDraft;
  membership: {
    roleCode: 'owner';
  };
};

export type BootstrapResult = {
  user: StoredUser;
  session: SessionDraft;
  organization: StoredOrganization;
  membership: {
    roleCode: 'owner';
  };
};

export interface OnboardingRepository {
  findUserByEmail(email: string): Promise<StoredUser | null>;
  bootstrap(input: BootstrapDraft): Promise<BootstrapResult>;
}
