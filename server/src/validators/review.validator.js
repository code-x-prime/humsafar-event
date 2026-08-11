import { z } from 'zod';

export const createReviewSchema = z.object({
  orderId: z.string().optional(),
  productId: z.string(),
  userId: z.string(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isFeatured: z.boolean().optional(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().optional(),
  comment: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().optional(),
  isFeatured: z.boolean().optional(),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  productId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleReviewSchema = z.object({
  field: z.enum(['isFeatured']),
  value: z.boolean(),
});
