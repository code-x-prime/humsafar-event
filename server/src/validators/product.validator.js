import { z } from 'zod';

const mediaItemSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO']).optional(),
  r2Key: z.string().min(1),
  url: z.string().min(1),
  alt: z.string().optional(),
});

const variantSchema = z.object({
  name: z.string().min(1),
  swatches: z.array(z.string()).optional(),
});

const faqItemSchema = z.object({
  question: z.string().min(1),
  answer: z.string().min(1),
});

export const createProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  inclusions: z.array(z.string()).optional(),
  exclusions: z.array(z.string()).optional(),
  careInfo: z.array(z.string()).optional(),
  deliveryInfo: z.string().optional(),
  setupTimeMinutes: z.coerce.number().int().optional(),
  price: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative().optional(),
  discountPercent: z.coerce.number().nonnegative().optional(),
  advancePercent: z.coerce.number().nonnegative().optional(),
  advanceAmount: z.coerce.number().nonnegative().optional(),
  isCustomizable: z.boolean().optional(),
  minLeadTimeHours: z.coerce.number().int().optional(),
  tags: z.array(z.string()).optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
  categoryIds: z.array(z.string()).optional(),
  cityIds: z.array(z.string()).optional(),
  media: z.array(mediaItemSchema).max(5).optional(),
  variants: z.array(variantSchema).optional(),
  faqItems: z.array(faqItemSchema).optional(),
  addOnIds: z.array(z.string()).optional(),
  sectionIds: z.array(z.string()).optional(),
});

export const updateProductSchema = createProductSchema.partial();

export const listProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleProductSchema = z.object({
  field: z.enum(['isActive', 'isFeatured', 'isCustomizable']),
  value: z.boolean(),
});

export const reorderProductsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
