import { z } from 'zod';

export const addCartItemSchema = z.object({
  productId: z.string().min(1),
  variantId: z.string().optional(),
  addOnIds: z.array(z.string()).optional(),
  qty: z.coerce.number().int().positive().optional(),
  eventDate: z.string().optional(),
  timeSlotId: z.string().optional(),
  cityId: z.string().optional(),
  notes: z.string().optional(),
});

export const updateCartItemSchema = z.object({
  qty: z.coerce.number().int().positive().optional(),
  variantId: z.string().nullable().optional(),
  addOnIds: z.array(z.string()).optional(),
  eventDate: z.string().nullable().optional(),
  timeSlotId: z.string().nullable().optional(),
  cityId: z.string().nullable().optional(),
  notes: z.string().nullable().optional(),
});
