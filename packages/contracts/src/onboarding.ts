import { z } from 'zod';

import { createOrganizationResponseSchema, createOrganizationInputSchema } from './organizations.js';
import { registerUserInputSchema, registerUserResponseSchema } from './auth.js';

export const bootstrapOnboardingInputSchema = z.object({
  user: registerUserInputSchema,
  organization: createOrganizationInputSchema,
});

export const bootstrapOnboardingResponseSchema = z.object({
  user: registerUserResponseSchema.shape.user,
  session: registerUserResponseSchema.shape.session,
  organization: createOrganizationResponseSchema.shape.organization,
  membership: z.object({
    roleCode: z.literal('owner'),
  }),
});

export type BootstrapOnboardingInput = z.infer<typeof bootstrapOnboardingInputSchema>;
export type BootstrapOnboardingResponse = z.infer<typeof bootstrapOnboardingResponseSchema>;
