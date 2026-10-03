import { z } from 'zod';

const reviewMediaItem = z.object({
  r2Key: z.string().min(1),
  url: z.string().min(1),
});

// Admin-created review. userId/source are set by the server from the
// logged-in admin, never accepted from the request body.
export const createReviewSchema = z.object({
  productId: z.string().min(1),
  reviewerName: z.string().trim().min(1).max(80),
  reviewerCity: z.string().trim().max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().max(150).optional(),
  comment: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  isFeatured: z.boolean().optional(),
  // Lets the admin backdate a review (e.g. feedback received weeks ago).
  createdAt: z.coerce.date().optional(),
  media: z.array(reviewMediaItem).max(5).optional(),
});

export const updateReviewSchema = z.object({
  rating: z.coerce.number().int().min(1).max(5).optional(),
  title: z.string().max(150).optional(),
  comment: z.string().max(2000).optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  adminReply: z.string().optional(),
  isFeatured: z.boolean().optional(),
  reviewerName: z.string().trim().min(1).max(80).optional(),
  reviewerCity: z.string().trim().max(80).optional(),
  createdAt: z.coerce.date().optional(),
  media: z.array(reviewMediaItem).max(5).optional(),
});

export const listReviewsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(['PENDING', 'APPROVED', 'REJECTED']).optional(),
  source: z.enum(['CUSTOMER', 'ADMIN']).optional(),
  productId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleReviewSchema = z.object({
  field: z.enum(['isFeatured']),
  value: z.boolean(),
});
