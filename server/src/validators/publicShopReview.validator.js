import { z } from 'zod';

export const submitShopReviewSchema = z.object({
  orderId: z.string().min(1),
  productId: z.string().min(1),
  rating: z.coerce.number().int().min(1).max(5),
  title: z.string().optional(),
  comment: z.string().optional(),
});
