import { z } from 'zod';

export const createSlotBlackoutSchema = z.object({
  date: z.coerce.date(),
  timeSlotId: z.string().optional(),
  cityId: z.string().optional(),
  reason: z.string().optional(),
});

export const updateSlotBlackoutSchema = createSlotBlackoutSchema.partial();

export const listSlotBlackoutsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  cityId: z.string().optional(),
  timeSlotId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});
