import type { LoginInput, LoginResponse, RegisterUserInput, RegisterUserResponse } from '@facturacion/contracts';
import { createSessionId, createSessionToken, createUserId } from '@facturacion/domain';

import type { AuthRepository } from '../repositories/auth-repository.js';
import { hashPassword, verifyPassword } from './password-service.js';

export class AuthService {
  constructor(private readonly repository: AuthRepository) {}

  async register(input: RegisterUserInput): Promise<RegisterUserResponse> {
    const existing = await this.repository.findUserByEmail(input.email);

    if (existing) {
      throw new Error('EMAIL_ALREADY_REGISTERED');
    }

    const user = await this.repository.createUser({
      id: createUserId(),
      email: input.email,
      fullName: input.fullName,
      passwordHash: hashPassword(input.password),
    });

    const session = await this.repository.createSession({
      id: createSessionId(),
      userId: user.id,
      token: createSessionToken(),
      expiresAt: createExpirationDate(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  }

  async login(input: LoginInput): Promise<LoginResponse> {
    const user = await this.repository.findUserByEmail(input.email);

    if (!user || !verifyPassword(input.password, user.passwordHash)) {
      throw new Error('INVALID_CREDENTIALS');
    }

    const session = await this.repository.createSession({
      id: createSessionId(),
      userId: user.id,
      token: createSessionToken(),
      expiresAt: createExpirationDate(),
    });

    return {
      user: {
        id: user.id,
        email: user.email,
        fullName: user.fullName,
        createdAt: user.createdAt,
      },
      session: {
        token: session.token,
        expiresAt: session.expiresAt,
      },
    };
  }
}

function createExpirationDate() {
  const expiration = new Date();
  expiration.setDate(expiration.getDate() + 7);
  return expiration.toISOString();
}
