import { z } from 'zod';

const mediaItemSchema = z.object({
  type: z.enum(['IMAGE', 'VIDEO']).optional(),
  r2Key: z.string().min(1),
  url: z.string().min(1),
  alt: z.string().optional(),
});

export const createShopProductSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  shortDescription: z.string().optional(),
  description: z.string().optional(),
  highlights: z.array(z.string()).optional(),
  price: z.coerce.number().nonnegative(),
  mrp: z.coerce.number().nonnegative().optional(),
  sku: z.string().optional(),
  stock: z.coerce.number().int().nonnegative().optional(),
  weightGrams: z.coerce.number().int().nonnegative().optional(),
  lengthCm: z.coerce.number().nonnegative().optional(),
  breadthCm: z.coerce.number().nonnegative().optional(),
  heightCm: z.coerce.number().nonnegative().optional(),
  shippingInfo: z.string().optional(),
  metaTitle: z.string().optional(),
  metaDescription: z.string().optional(),
  isActive: z.boolean().optional(),
  isFeatured: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
  categoryIds: z.array(z.string()).optional(),
  media: z.array(mediaItemSchema).max(8).optional(),
});

export const updateShopProductSchema = createShopProductSchema.partial();

export const listShopProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  isFeatured: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleShopProductSchema = z.object({
  field: z.enum(['isActive', 'isFeatured']),
  value: z.boolean(),
});

export const reorderShopProductsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});

export const listPublicShopProductsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  categorySlug: z.string().optional(),
  sort: z.enum(['latest', 'price_asc', 'price_desc', 'rating']).optional(),
});
