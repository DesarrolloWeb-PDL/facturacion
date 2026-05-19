import type {
  ClaimVoucherAuthorizationInput,
  ClaimVoucherAuthorizationResponse,
  ReleaseVoucherAuthorizationInput,
  ReleaseVoucherAuthorizationResponse,
} from '@facturacion/contracts';

import type { VoucherClaimRepository } from '../repositories/voucher-claim-repository.js';

export class VoucherClaimService {
  constructor(private readonly repository: VoucherClaimRepository) {}

  async claimAuthorization(input: ClaimVoucherAuthorizationInput): Promise<ClaimVoucherAuthorizationResponse> {
    return this.repository.claimAuthorization(input);
  }

  async releaseAuthorization(input: ReleaseVoucherAuthorizationInput): Promise<ReleaseVoucherAuthorizationResponse> {
    return this.repository.releaseAuthorization(input);
  }
}