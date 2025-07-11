import { z } from 'zod';

export const StatusDto = z.string().refine((val) => {
  const validStatuses = ['STATUS_WAIT_CODE', 'STATUS_OK', 'STATUS_CANCEL', 'WRONG_ACTIVATION_ID'];
  return validStatuses.includes(val);
}, {
  message: 'Invalid status response from SMS-Activate',
});

export type StatusDto = z.infer<typeof StatusDto>;