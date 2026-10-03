import { z } from 'zod';

// Review from the product page — works with or without an account and needs no
// purchase. It always lands as PENDING until an admin approves it.
export const openReviewSchema = z.object({
  productId: z.string().min(1),
  reviewerName: z.string().trim().min(2).max(80),
  reviewerCity: z.string().trim().max(80).optional(),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().trim().max(150).optional(),
  comment: z.string().trim().min(10).max(2000),
  // Photos the customer uploaded first via the review upload endpoint. Only the
  // key is accepted — the URL is looked up server-side.
  media: z.array(z.object({ r2Key: z.string().min(1) })).max(5).optional(),
  // Honeypot: hidden from people, so only bots fill it in.
  website: z.string().max(0).optional(),
});

export const submitReviewSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});
