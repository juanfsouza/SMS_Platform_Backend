import { z } from 'zod';

export const SetMarkupDto = z.object({
  percentage: z.number().min(0, 'Percentage must be non-negative').max(3000, 'Percentage cannot exceed 3000'),
});

export const UpdateMarkupDto = z.object({
  percentage: z.number().min(0, 'Percentage must be non-negative').max(3000, 'Percentage cannot exceed 3000'),
});

export const UpdateSinglePriceDto = z.object({
  service: z.string().min(1, 'Service is required'),
  country: z.string().min(1, 'Country is required'),
  priceBrl: z.number().min(0, 'Price must be non-negative'),
  priceUsd: z.number().min(0, 'Price must be non-negative'),
});

export type UpdateSinglePriceDto = z.infer<typeof UpdateSinglePriceDto>;
export type SetMarkupDto = z.infer<typeof SetMarkupDto>;
export type UpdateMarkupDto = z.infer<typeof UpdateMarkupDto>;