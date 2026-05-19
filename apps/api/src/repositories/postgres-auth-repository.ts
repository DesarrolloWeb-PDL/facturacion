import { Pool } from 'pg';

import type { SessionDraft } from '@facturacion/domain';

import type { AuthRepository, StoredUser } from './auth-repository.js';
import { hashSessionToken } from '../services/password-service.js';

export class PostgresAuthRepository implements AuthRepository {
  constructor(private readonly pool: Pool) {}

  async createUser(input: {
    id: string;
    email: string;
    fullName: string;
    passwordHash: string;
  }): Promise<StoredUser> {
    const result = await this.pool.query<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
      created_at: string;
    }>(
      `
        insert into users (id, email, full_name, password_hash)
        values ($1, $2, $3, $4)
        returning id, email, full_name, password_hash, created_at::text
      `,
      [input.id, input.email.toLowerCase(), input.fullName, input.passwordHash],
    );

    const row = result.rows[0];

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  async findUserByEmail(email: string): Promise<StoredUser | null> {
    const result = await this.pool.query<{
      id: string;
      email: string;
      full_name: string;
      password_hash: string;
      created_at: string;
    }>(
      `
        select id, email, full_name, password_hash, created_at::text
        from users
        where email = $1 and is_active = true
        limit 1
      `,
      [email.toLowerCase()],
    );

    const row = result.rows[0];

    if (!row) {
      return null;
    }

    return {
      id: row.id,
      email: row.email,
      fullName: row.full_name,
      passwordHash: row.password_hash,
      createdAt: row.created_at,
    };
  }

  async createSession(input: SessionDraft): Promise<SessionDraft> {
    await this.pool.query(
      `
        insert into sessions (id, user_id, token_hash, expires_at)
        values ($1, $2, $3, $4)
      `,
      [input.id, input.userId, hashSessionToken(input.token), input.expiresAt],
    );

    return input;
  }
}
