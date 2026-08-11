import { z } from 'zod';

export const previewOrderSchema = z.object({
  cityId: z.string().min(1),
  couponCode: z.string().optional(),
});

export const createOrderSchema = z.object({
  addressId: z.string().min(1),
  eventDate: z.string().min(1),
  timeSlotId: z.string().optional(),
  paymentMode: z.enum(['FULL', 'ADVANCE']).optional(),
  couponCode: z.string().optional(),
  customerNote: z.string().optional(),
});

export const verifyPaymentSchema = z.object({
  razorpayOrderId: z.string().min(1),
  razorpayPaymentId: z.string().min(1),
  razorpaySignature: z.string().min(1),
});
