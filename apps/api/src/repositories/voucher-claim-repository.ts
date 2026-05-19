import type {
  ClaimVoucherAuthorizationInput,
  ClaimVoucherAuthorizationResponse,
  ReleaseVoucherAuthorizationInput,
  ReleaseVoucherAuthorizationResponse,
  VoucherWorkflowStatus,
} from '@facturacion/contracts';

export type StoredVoucherAuthorizationClaim = {
  organizationId: string;
  voucherLocalId: string;
  status: VoucherWorkflowStatus;
  lock: {
    deviceId: string;
    userId?: string;
    claimedAt: string;
    expiresAt: string;
  } | null;
};

export interface VoucherClaimRepository {
  claimAuthorization(input: ClaimVoucherAuthorizationInput): Promise<ClaimVoucherAuthorizationResponse>;
  releaseAuthorization(input: ReleaseVoucherAuthorizationInput): Promise<ReleaseVoucherAuthorizationResponse>;
}