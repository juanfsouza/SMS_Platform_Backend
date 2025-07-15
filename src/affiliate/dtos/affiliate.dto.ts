import { z } from 'zod';

export const SetAffiliateCommissionDto = z.object({
  percentage: z.number().nonnegative().max(100, 'Percentage must be between 0 and 100'),
});

export const RequestWithdrawalDto = z.object({
  amount: z.number().positive().min(50, 'Minimum withdrawal amount is 50 BRL'),
  pixKey: z.string().min(1, 'PIX key is required'),
});

export type SetAffiliateCommissionDto = z.infer<typeof SetAffiliateCommissionDto>;
export type RequestWithdrawalDto = z.infer<typeof RequestWithdrawalDto>;