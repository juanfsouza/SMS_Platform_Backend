import { z } from 'zod';

export const CreatePaymentDto = z.object({
  amount: z.number().positive().min(1, 'Amount must be at least 1'),
});

export type CreatePaymentDto = z.infer<typeof CreatePaymentDto>;