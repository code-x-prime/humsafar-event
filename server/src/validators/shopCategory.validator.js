import { z } from 'zod';

export const createShopCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  image: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateShopCategorySchema = createShopCategorySchema.partial();

export const toggleShopCategorySchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderShopCategoriesSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
