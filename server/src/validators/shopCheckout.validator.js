import { z } from 'zod';

export const createShopOrderSchema = z.object({
  addressId: z.string().min(1),
  customerNote: z.string().optional(),
});

export const verifyShopPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});

export const cancelPaidShopOrderSchema = z.object({
  reason: z.string().min(1, 'Please tell us why you want to cancel this order'),
});
