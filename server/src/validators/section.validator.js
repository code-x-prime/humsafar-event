import { z } from 'zod';

export const createSectionSchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateSectionSchema = createSectionSchema.partial();

export const toggleSectionSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderSectionsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});

export const addProductSchema = z.object({
  productId: z.string().min(1),
});

export const reorderSectionProductsSchema = z.object({
  items: z.array(z.object({ productId: z.string(), position: z.number().int() })).min(1),
});

export const reorderHomeFeedSchema = z.object({
  items: z.array(z.object({ type: z.enum(['section', 'banner']), id: z.string(), position: z.number().int() })).min(1),
});
