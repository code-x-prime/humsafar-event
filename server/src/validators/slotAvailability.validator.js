import { z } from 'zod';

export const getAvailabilityQuerySchema = z.object({
  // Optional: before an address is picked the customer still sees the times.
  cityId: z.string().min(1).optional(),
  date: z.string().min(1),
});
