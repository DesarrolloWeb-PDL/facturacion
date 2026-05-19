import { Pool } from 'pg';

import type {
  ClaimVoucherAuthorizationInput,
  ClaimVoucherAuthorizationResponse,
  ReleaseVoucherAuthorizationInput,
  ReleaseVoucherAuthorizationResponse,
  VoucherWorkflowStatus,
} from '@facturacion/contracts';

import type { VoucherClaimRepository } from './voucher-claim-repository.js';

export class PostgresVoucherClaimRepository implements VoucherClaimRepository {
  constructor(private readonly pool: Pool) {}

  async claimAuthorization(input: ClaimVoucherAuthorizationInput): Promise<ClaimVoucherAuthorizationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const current = await client.query<ClaimRow>(
        `
          select organization_id::text, voucher_local_id, workflow_status, device_id::text, user_id::text, claimed_at::text, expires_at::text, released_at::text
          from voucher_authorization_claims
          where organization_id = $1 and voucher_local_id = $2
          for update
        `,
        [input.organizationId, input.voucherLocalId],
      );

      const now = new Date();
      const claimedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000).toISOString();
      const row = current.rows[0];

      if (!row) {
        await client.query(
          `
            insert into voucher_authorization_claims (
              organization_id,
              voucher_local_id,
              workflow_status,
              device_id,
              user_id,
              claimed_at,
              expires_at,
              released_at
            ) values ($1, $2, 'authorizing', $3, $4, $5, $6, null)
          `,
          [input.organizationId, input.voucherLocalId, input.actor.deviceId, input.actor.userId ?? null, claimedAt, expiresAt],
        );

        await client.query('commit');

        return {
          claimGranted: true,
          voucher: buildVoucherState({
            organization_id: input.organizationId,
            voucher_local_id: input.voucherLocalId,
            workflow_status: 'authorizing',
            device_id: input.actor.deviceId,
            user_id: input.actor.userId ?? null,
            claimed_at: claimedAt,
            expires_at: expiresAt,
            released_at: null,
          }),
        };
      }

      const claimExpired = row.released_at !== null || new Date(row.expires_at) <= now;
      const sameDevice = row.device_id === input.actor.deviceId;

      if (claimExpired || sameDevice) {
        await client.query(
          `
            update voucher_authorization_claims
            set workflow_status = 'authorizing',
                device_id = $3,
                user_id = $4,
                claimed_at = $5,
                expires_at = $6,
                released_at = null
            where organization_id = $1 and voucher_local_id = $2
          `,
          [input.organizationId, input.voucherLocalId, input.actor.deviceId, input.actor.userId ?? null, claimedAt, expiresAt],
        );

        await client.query('commit');

        return {
          claimGranted: true,
          voucher: buildVoucherState({
            organization_id: input.organizationId,
            voucher_local_id: input.voucherLocalId,
            workflow_status: 'authorizing',
            device_id: input.actor.deviceId,
            user_id: input.actor.userId ?? null,
            claimed_at: claimedAt,
            expires_at: expiresAt,
            released_at: null,
          }),
        };
      }

      await client.query('commit');

      return {
        claimGranted: false,
        voucher: buildVoucherState(row),
        reason: 'Otro dispositivo ya esta procesando este comprobante.',
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }

  async releaseAuthorization(input: ReleaseVoucherAuthorizationInput): Promise<ReleaseVoucherAuthorizationResponse> {
    const client = await this.pool.connect();

    try {
      await client.query('begin');

      const current = await client.query<ClaimRow>(
        `
          select organization_id::text, voucher_local_id, workflow_status, device_id::text, user_id::text, claimed_at::text, expires_at::text, released_at::text
          from voucher_authorization_claims
          where organization_id = $1 and voucher_local_id = $2
          for update
        `,
        [input.organizationId, input.voucherLocalId],
      );

      const row = current.rows[0];

      if (!row || row.released_at !== null || row.device_id !== input.actor.deviceId) {
        await client.query('commit');
        return {
          released: false,
          voucher: row
            ? buildVoucherState(row)
            : {
                organizationId: input.organizationId,
                voucherLocalId: input.voucherLocalId,
                status: 'pending_authorization',
                lock: null,
              },
        };
      }

      const releasedAt = new Date().toISOString();

      await client.query(
        `
          update voucher_authorization_claims
          set workflow_status = 'pending_authorization',
              released_at = $3,
              expires_at = $3
          where organization_id = $1 and voucher_local_id = $2
        `,
        [input.organizationId, input.voucherLocalId, releasedAt],
      );

      await client.query('commit');

      return {
        released: true,
        voucher: {
          organizationId: input.organizationId,
          voucherLocalId: input.voucherLocalId,
          status: 'pending_authorization',
          lock: null,
        },
      };
    } catch (error) {
      await client.query('rollback');
      throw error;
    } finally {
      client.release();
    }
  }
}

type ClaimRow = {
  organization_id: string;
  voucher_local_id: string;
  workflow_status: VoucherWorkflowStatus;
  device_id: string;
  user_id: string | null;
  claimed_at: string;
  expires_at: string;
  released_at: string | null;
};

function buildVoucherState(row: ClaimRow): ClaimVoucherAuthorizationResponse['voucher'] {
  return {
    organizationId: row.organization_id,
    voucherLocalId: row.voucher_local_id,
    status: row.released_at ? 'pending_authorization' : row.workflow_status,
    lock: row.released_at
      ? null
      : {
          deviceId: row.device_id,
          userId: row.user_id ?? undefined,
          claimedAt: row.claimed_at,
          expiresAt: row.expires_at,
        },
  };
}