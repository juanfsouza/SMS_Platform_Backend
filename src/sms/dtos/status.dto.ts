import { z } from 'zod';

export const StatusDto = z
  .string()
  .transform((value, ctx) => {
    if (value.startsWith('STATUS_OK:')) {
      return {
        status: 'success',
        code: value.replace('STATUS_OK:', ''),
      };
    } else if (value === 'STATUS_WAIT_CODE') {
      return {
        status: 'pending',
        code: null,
      };
    } else if (value === 'STATUS_CANCEL') {
      return {
        status: 'cancelled',
        code: null,
      };
    } else {
      ctx.addIssue({
        code: z.ZodIssueCode.custom,
        message: 'Invalid status response from SMS-Activate',
      });
      return z.NEVER;
    }
  })
  .refine((data) => data !== z.NEVER, {
    message: 'Invalid status response from SMS-Activate',
  });

export type StatusDto = z.infer<typeof StatusDto>;