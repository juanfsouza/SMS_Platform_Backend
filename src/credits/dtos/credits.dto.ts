import { z } from 'zod';

export const SetMarkupDto = z.object({
  percentage: z.number().min(0, 'Percentage must be non-negative').max(3000, 'Percentage cannot exceed 3000'),
});

export const UpdateMarkupDto = z.object({
  percentage: z.number().min(0, 'Percentage must be non-negative').max(3000, 'Percentage cannot exceed 3000'),
});

export type SetMarkupDto = z.infer<typeof SetMarkupDto>;
export type UpdateMarkupDto = z.infer<typeof UpdateMarkupDto>;