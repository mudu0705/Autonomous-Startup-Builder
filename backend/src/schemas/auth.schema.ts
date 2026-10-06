import { z } from 'zod';
import { UserLoginSchema, UserRegistrationSchema } from '../../../shared/schemas/index.ts';

export const LoginRequestSchema = UserLoginSchema;
export const RegisterRequestSchema = UserRegistrationSchema;

export const AuthTokenResponseSchema = z.object({
  token: z.string(),
  user: z.object({
    id: z.string(),
    email: z.string().email(),
    role: z.enum(['user', 'admin']),
    fullName: z.string().optional(),
  }),
});
