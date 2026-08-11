import { z } from 'zod';

export const createSlotSchema = z.object({
  label: z.string().min(1),
  startTime: z.string().min(1),
  endTime: z.string().min(1),
  capacity: z.coerce.number().int().positive().optional(),
  surgeCharge: z.coerce.number().nonnegative().optional(),
  cityId: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateSlotSchema = createSlotSchema.partial();

export const listSlotsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  cityId: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleSlotSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderSlotsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
