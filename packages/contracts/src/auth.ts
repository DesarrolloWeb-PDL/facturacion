import { z } from 'zod';

const userSchema = z.object({
  id: z.string().uuid(),
  email: z.string().email(),
  fullName: z.string(),
  createdAt: z.string().datetime(),
});

const sessionSchema = z.object({
  token: z.string().min(32),
  expiresAt: z.string().datetime(),
});

export const registerUserInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
  fullName: z.string().trim().min(3).max(160),
});

export const registerUserResponseSchema = z.object({
  user: userSchema,
  session: sessionSchema,
});

export const loginInputSchema = z.object({
  email: z.string().trim().email(),
  password: z.string().min(8).max(72),
});

export const loginResponseSchema = z.object({
  user: userSchema,
  session: sessionSchema,
});

export type RegisterUserInput = z.infer<typeof registerUserInputSchema>;
export type RegisterUserResponse = z.infer<typeof registerUserResponseSchema>;
export type LoginInput = z.infer<typeof loginInputSchema>;
export type LoginResponse = z.infer<typeof loginResponseSchema>;
