import { z } from 'zod';

export const createAddOnSchema = z.object({
  name: z.string().min(1),
  price: z.coerce.number().nonnegative(),
  image: z.string().optional(),
  imageR2Key: z.string().optional(),
  categoryId: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateAddOnSchema = createAddOnSchema.partial();

export const listAddOnsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  categoryId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleAddOnSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const createAddOnCategorySchema = z.object({
  name: z.string().min(1),
  position: z.coerce.number().int().optional(),
});

export const updateAddOnCategorySchema = createAddOnCategorySchema.partial();

export const reorderAddOnsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
