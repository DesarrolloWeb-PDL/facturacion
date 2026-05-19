import { Pool } from 'pg';

import { hashSessionToken } from '../services/password-service.js';
import type { StoredUser } from './auth-repository.js';
import type { BootstrapDraft, BootstrapResult, OnboardingRepository } from './onboarding-repository.js';

export class PostgresOnboardingRepository implements OnboardingRepository {
  constructor(private readonly pool: Pool) {}

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

  async bootstrap(input: BootstrapDraft): Promise<BootstrapResult> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const userResult = await client.query<{
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
        [input.user.id, input.user.email.toLowerCase(), input.user.fullName, input.user.passwordHash],
      );

      const organizationResult = await client.query<{
        id: string;
        legal_name: string;
        cuit: string;
        ingresos_brutos: string | null;
        activity_start_date: string;
        iva_condition_code: string;
        tax_regime: string | null;
        created_at: string;
      }>(
        `
          insert into organizations (
            id,
            legal_name,
            cuit,
            ingresos_brutos,
            activity_start_date,
            iva_condition_code,
            tax_regime
          ) values ($1, $2, $3, $4, $5, $6, $7)
          returning id, legal_name, cuit::text, ingresos_brutos, activity_start_date::text, iva_condition_code, tax_regime, created_at::text
        `,
        [
          input.organization.id,
          input.organization.legalName,
          input.organization.cuit,
          input.organization.ingresosBrutos ?? null,
          input.organization.activityStartDate,
          input.organization.ivaConditionCode,
          input.organization.taxRegime ?? null,
        ],
      );

      for (const pointOfSale of input.organization.pointsOfSale) {
        await client.query(
          `
            insert into points_of_sale (organization_id, pos_number, description, environment, active)
            values ($1, $2, $3, $4, true)
          `,
          [input.organization.id, pointOfSale.posNumber, pointOfSale.description ?? null, input.organization.environment],
        );
      }

      await client.query(
        `
          insert into organization_users (organization_id, user_id, role_code)
          values ($1, $2, $3)
        `,
        [input.organization.id, input.user.id, input.membership.roleCode],
      );

      await client.query(
        `
          insert into sessions (id, user_id, token_hash, expires_at)
          values ($1, $2, $3, $4)
        `,
        [input.session.id, input.session.userId, hashSessionToken(input.session.token), input.session.expiresAt],
      );

      await client.query('commit');

      const user = userResult.rows[0];
      const organization = organizationResult.rows[0];

      return {
        user: {
          id: user.id,
          email: user.email,
          fullName: user.full_name,
          passwordHash: user.password_hash,
          createdAt: user.created_at,
        },
        session: input.session,
        organization: {
          id: organization.id,
          legalName: organization.legal_name,
          cuit: organization.cuit,
          ingresosBrutos: organization.ingresos_brutos ?? undefined,
          activityStartDate: organization.activity_start_date,
          ivaConditionCode: organization.iva_condition_code,
          taxRegime: organization.tax_regime ?? undefined,
          environment: input.organization.environment,
          pointsOfSale: [...input.organization.pointsOfSale],
          createdAt: organization.created_at,
        },
        membership: input.membership,
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}
