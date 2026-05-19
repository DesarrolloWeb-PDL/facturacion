import type { SessionDraft } from '@facturacion/domain';

import type { AuthRepository, StoredUser } from './auth-repository.js';
import type { MemoryStore } from './memory-store.js';

export class MemoryAuthRepository implements AuthRepository {
  constructor(private readonly store: MemoryStore) {}

  async createUser(input: {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }): Promise<StoredUser> {
    const stored: StoredUser = {
      id: input.id,
      email: input.email,
      fullName: input.fullName,
      passwordHash: input.passwordHash,
      createdAt: new Date().toISOString(),
    };

    this.store.usersByEmail.set(stored.email.toLowerCase(), stored);
    return stored;
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    return this.store.usersByEmail.get(email.toLowerCase()) ?? null;
  }

  async createSession(input: SessionDraft): Promise<SessionDraft> {
    this.store.sessionsById.set(input.id, input);
    return input;
  }
}
