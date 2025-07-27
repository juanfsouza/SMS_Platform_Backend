import { z } from 'zod';

export const RegisterDto = z.object({
  name: z.string().min(2, 'Name must be at least 2 characters'),
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
  affiliateCode: z.string().optional(),
});

export const LoginDto = z.object({
  email: z.string().email('Invalid email address'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export const ForgotPasswordDto = z.object({
  email: z.string().email('Invalid email address'),
});

export const ResetPasswordDto = z.object({
  token: z.string().min(1, 'Token is required'),
  password: z.string().min(6, 'Password must be at least 6 characters'),
});

export type RegisterDto = z.infer<typeof RegisterDto>;
export type LoginDto = z.infer<typeof LoginDto>;
export type ForgotPasswordDto = z.infer<typeof ForgotPasswordDto>;
export type ResetPasswordDto = z.infer<typeof ResetPasswordDto>;