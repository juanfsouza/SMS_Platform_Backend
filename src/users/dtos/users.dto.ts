import { z } from 'zod';

export const UpdateUserDto = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
  pixKey: z.string().optional(),
});

export const AddBalanceDto = z.object({
  userId: z.number().int().positive(),
  amount: z.number().positive('Amount must be positive'),
});

export const UpdateBalanceDto = z.object({
  userId: z.number().int().positive(),
  balance: z.number().nonnegative('Balance cannot be negative'),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDto>;
export type AddBalanceDto = z.infer<typeof AddBalanceDto>;
export type UpdateBalanceDto = z.infer<typeof UpdateBalanceDto>;