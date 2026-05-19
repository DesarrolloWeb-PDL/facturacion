import { z } from 'zod';

const pointOfSaleSchema = z.object({
  posNumber: z.number().int().positive(),
  description: z.string().trim().min(1).max(120).optional(),
});

export const createOrganizationInputSchema = z.object({
  legalName: z.string().trim().min(3).max(160),
  cuit: z.string().regex(/^\d{11}$/),
  ivaConditionCode: z.string().trim().min(1).max(8),
  ingresosBrutos: z.string().trim().min(1).max(32).optional(),
  activityStartDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/),
  taxRegime: z.string().trim().min(1).max(32).optional(),
  environment: z.enum(['testing', 'production']),
  pointsOfSale: z.array(pointOfSaleSchema).min(1),
});

export const createOrganizationResponseSchema = z.object({
  organization: z.object({
    id: z.string().uuid(),
    legalName: z.string(),
    cuit: z.string(),
    ivaConditionCode: z.string(),
    ingresosBrutos: z.string().optional(),
    activityStartDate: z.string(),
    taxRegime: z.string().optional(),
    environment: z.enum(['testing', 'production']),
    pointsOfSale: z.array(pointOfSaleSchema),
    createdAt: z.string().datetime(),
  }),
});

export type CreateOrganizationInput = z.infer<typeof createOrganizationInputSchema>;
export type CreateOrganizationResponse = z.infer<typeof createOrganizationResponseSchema>;
