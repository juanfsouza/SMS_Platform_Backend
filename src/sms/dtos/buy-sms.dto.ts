import { z } from 'zod';

const VALID_SERVICES = ['wa', 'tg', 'vk', 'ok', 'wb', 'go', 'fb', 'tw', 'ot'];

export const BuySmsDto = z.object({
  service: z.string().refine((val) => VALID_SERVICES.includes(val), {
    message: `Invalid service. Must be one of: ${VALID_SERVICES.join(', ')}`,
  }),
  country: z.string().regex(/^\d+$/, { message: 'Country must be a numeric code' }),
});

export type BuySmsDto = z.infer<typeof BuySmsDto>;