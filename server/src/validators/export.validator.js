import { z } from 'zod';

export const exportQuerySchema = z.object({
  model: z.enum(['cities', 'pincodes']),
  search: z.string().optional(),
});
