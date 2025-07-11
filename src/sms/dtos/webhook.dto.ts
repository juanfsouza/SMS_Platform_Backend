import { z } from 'zod';

export const WebhookDto = z.object({
  activationId: z.string(),
  status: z.string(),
  code: z.string().optional(),
});

export type WebhookDto = z.infer<typeof WebhookDto>;