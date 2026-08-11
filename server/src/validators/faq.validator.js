import { z } from 'zod';

export const createFaqSchema = z.object({
  scope: z.enum(['GLOBAL', 'PRODUCT', 'CATEGORY']).optional(),
  refId: z.string().optional(),
  question: z.string().min(1),
  answer: z.string().min(1),
  position: z.coerce.number().int().optional(),
});

export const updateFaqSchema = createFaqSchema.partial();

export const listFaqsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  scope: z.enum(['GLOBAL', 'PRODUCT', 'CATEGORY']).optional(),
  refId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const reorderFaqsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
