import type { ClaimVoucherAuthorizationInput, ClaimVoucherAuthorizationResponse, ReleaseVoucherAuthorizationInput, ReleaseVoucherAuthorizationResponse } from '@facturacion/contracts';

import type { VoucherClaimRepository } from './voucher-claim-repository.js';

type MemoryClaim = ClaimVoucherAuthorizationResponse['voucher'];

export class MemoryVoucherClaimRepository implements VoucherClaimRepository {
  private readonly claims = new Map<string, MemoryClaim>();

  async claimAuthorization(input: ClaimVoucherAuthorizationInput): Promise<ClaimVoucherAuthorizationResponse> {
    const key = buildKey(input.organizationId, input.voucherLocalId);
    const current = this.claims.get(key);
    const now = new Date();

    if (!current || !current.lock || new Date(current.lock.expiresAt) <= now || current.lock.deviceId === input.actor.deviceId) {
      const claimedAt = now.toISOString();
      const expiresAt = new Date(now.getTime() + input.ttlSeconds * 1000).toISOString();
      const next: MemoryClaim = {
        organizationId: input.organizationId,
        voucherLocalId: input.voucherLocalId,
        status: 'authorizing',
        lock: {
          deviceId: input.actor.deviceId,
          userId: input.actor.userId,
          claimedAt,
          expiresAt,
        },
      };

      this.claims.set(key, next);
      return {
        claimGranted: true,
        voucher: next,
      };
    }

    return {
      claimGranted: false,
      voucher: current,
      reason: 'Otro dispositivo ya esta procesando este comprobante.',
    };
  }

  async releaseAuthorization(input: ReleaseVoucherAuthorizationInput): Promise<ReleaseVoucherAuthorizationResponse> {
    const key = buildKey(input.organizationId, input.voucherLocalId);
    const current = this.claims.get(key);

    if (!current || !current.lock || current.lock.deviceId !== input.actor.deviceId) {
      return {
        released: false,
        voucher: current ?? {
          organizationId: input.organizationId,
          voucherLocalId: input.voucherLocalId,
          status: 'pending_authorization',
          lock: null,
        },
      };
    }

    const released: MemoryClaim = {
      ...current,
      status: 'pending_authorization',
      lock: null,
    };

    this.claims.set(key, released);

    return {
      released: true,
      voucher: released,
    };
  }
}

function buildKey(organizationId: string, voucherLocalId: string) {
  return `${organizationId}:${voucherLocalId}`;
}