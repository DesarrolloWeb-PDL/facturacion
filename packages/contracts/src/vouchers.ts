import { z } from 'zod';

export const voucherWorkflowStatusSchema = z.enum([
  'draft',
  'pending_authorization',
  'authorizing',
  'authorized',
  'rejected',
]);

const fiscalAuthorizationSchema = z.object({
  cae: z.string().min(1),
  caeDueDate: z.string().datetime(),
  qrPayloadUrl: z.string().url(),
  qrLabel: z.string().min(1),
  source: z.enum(['demo', 'wsfev1']),
});

export const authorizeVoucherInputSchema = z.object({
  organization: z.object({
    cuit: z.string().regex(/^\d{11}$/),
    environment: z.enum(['testing', 'production']),
  }),
  voucher: z.object({
    localId: z.string().min(1),
    voucherType: z.string().min(1),
    pointOfSale: z.number().int().positive(),
    issuedAt: z.string().datetime(),
    total: z.number().positive(),
    customerName: z.string().trim().min(1).max(160),
    customerDocument: z.string().trim().min(1).max(32),
    customerIvaCondition: z.string().trim().min(1).max(64).optional(),
  }),
});

const voucherAuthorizationClaimSchema = z.object({
  organizationId: z.string().uuid(),
  voucherLocalId: z.string().min(1).max(120),
  status: voucherWorkflowStatusSchema,
  lock: z
    .object({
      deviceId: z.string().uuid(),
      userId: z.string().uuid().optional(),
      claimedAt: z.string().datetime(),
      expiresAt: z.string().datetime(),
    })
    .nullable(),
});

export const claimVoucherAuthorizationInputSchema = z.object({
  organizationId: z.string().uuid(),
  voucherLocalId: z.string().min(1).max(120),
  actor: z.object({
    deviceId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }),
  ttlSeconds: z.number().int().min(30).max(900).default(300),
});

export const claimVoucherAuthorizationResponseSchema = z.object({
  claimGranted: z.boolean(),
  voucher: voucherAuthorizationClaimSchema,
  reason: z.string().min(1).max(240).optional(),
});

export const releaseVoucherAuthorizationInputSchema = z.object({
  organizationId: z.string().uuid(),
  voucherLocalId: z.string().min(1).max(120),
  actor: z.object({
    deviceId: z.string().uuid(),
    userId: z.string().uuid().optional(),
  }),
});

export const releaseVoucherAuthorizationResponseSchema = z.object({
  released: z.boolean(),
  voucher: voucherAuthorizationClaimSchema,
});

export const authorizeVoucherResponseSchema = z.object({
  voucher: z.object({
    localId: z.string(),
    voucherType: z.string(),
    pointOfSale: z.number().int().positive(),
    number: z.number().int().positive(),
    issuedAt: z.string().datetime(),
    status: z.literal('Autorizado ARCA'),
  }),
  authorization: fiscalAuthorizationSchema.extend({
    source: z.literal('wsfev1'),
  }),
  arca: z.object({
    result: z.string().min(1),
    reproceso: z.string().optional(),
  }),
});

export type AuthorizeVoucherInput = z.infer<typeof authorizeVoucherInputSchema>;
export type AuthorizeVoucherResponse = z.infer<typeof authorizeVoucherResponseSchema>;
export type VoucherWorkflowStatus = z.infer<typeof voucherWorkflowStatusSchema>;
export type ClaimVoucherAuthorizationInput = z.infer<typeof claimVoucherAuthorizationInputSchema>;
export type ClaimVoucherAuthorizationResponse = z.infer<typeof claimVoucherAuthorizationResponseSchema>;
export type ReleaseVoucherAuthorizationInput = z.infer<typeof releaseVoucherAuthorizationInputSchema>;
export type ReleaseVoucherAuthorizationResponse = z.infer<typeof releaseVoucherAuthorizationResponseSchema>;