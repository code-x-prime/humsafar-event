import { z } from 'zod';

export const getAvailabilityQuerySchema = z.object({
  cityId: z.string().min(1),
  date: z.string().min(1),
});
