import type { AppUser, SessionDraft } from '@facturacion/domain';

export type StoredUser = AppUser & {
  passwordHash: string;
};

export interface AuthRepository {
  createUser(input: {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }): Promise<StoredUser>;
  findUserByEmail(email: string): Promise<StoredUser | null>;
  createSession(input: SessionDraft): Promise<SessionDraft>;
}
