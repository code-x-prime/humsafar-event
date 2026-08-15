import { z } from 'zod';

export const updateShopReviewSchema = z.object({
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

export const listShopReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  productId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleShopReviewSchema = z.object({
  field: z.enum(['isFeatured']),
  value: z.boolean(),
});
