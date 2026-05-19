import type { StoredUser } from './auth-repository.js';
import type { MemoryStore } from './memory-store.js';
import type { BootstrapDraft, BootstrapResult, OnboardingRepository } from './onboarding-repository.js';

export class MemoryOnboardingRepository implements OnboardingRepository {
  constructor(private readonly store: MemoryStore) {}

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.store.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async bootstrap(input: BootstrapDraft): Promise<BootstrapResult> {
    const user: StoredUser = {
      id: input.user.id,
      email: input.user.email.toLowerCase(),
      fullName: input.user.fullName,
      passwordHash: input.user.passwordHash,
      createdAt: new Date().toISOString(),
    };

    const organization = {
      ...input.organization,
      pointsOfSale: [...input.organization.pointsOfSale],
      createdAt: new Date().toISOString(),
    };

    this.store.usersByEmail.set(user.email, user);
    this.store.sessionsById.set(input.session.id, input.session);
    this.store.organizationsById.set(organization.id, organization);

    return {
      user,
      session: input.session,
      organization,
      membership: input.membership,
    };
  }
}
