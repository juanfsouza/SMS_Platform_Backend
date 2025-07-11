import { z } from 'zod';

export const UpdateUserDto = z.object({
  email: z.string().email().optional(),
  password: z.string().min(6).optional(),
});

export type UpdateUserDto = z.infer<typeof UpdateUserDto>;