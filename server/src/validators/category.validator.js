import { z } from 'zod';

export const createCategorySchema = z.object({
  name: z.string().min(1),
  slug: z.string().min(1).optional(),
  description: z.string().optional(),
  image: z.string().optional(),
  imageR2Key: z.string().optional(),
  icon: z.string().optional(),
  bannerDesktop: z.string().optional(),
  bannerMobile: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean().optional(),
  showInMenu: z.boolean().optional(),
  showOnHome: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
  parentId: z.string().optional(),
});

export const updateCategorySchema = createCategorySchema.partial();

export const listCategoriesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  parentId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleCategorySchema = z.object({
  field: z.enum(['isActive', 'showInMenu', 'showOnHome']),
  value: z.boolean(),
});

export const reorderCategoriesSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
