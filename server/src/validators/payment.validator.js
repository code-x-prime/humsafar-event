import { z } from 'zod';

const PAYMENT_STATUSES = ['CREATED', 'PAID', 'FAILED', 'REFUNDED', 'PARTIAL_REFUND'];

export const createPaymentSchema = z.object({
  orderId: z.string(),
  gateway: z.string().optional(),
  razorpayOrderId: z.string().optional(),
  razorpayPaymentId: z.string().optional(),
  razorpaySignature: z.string().optional(),
  amount: z.coerce.number().nonnegative(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  method: z.string().optional(),
});

export const updatePaymentSchema = z.object({
  status: z.enum(PAYMENT_STATUSES).optional(),
  method: z.string().optional(),
  refundId: z.string().optional(),
  refundAmount: z.coerce.number().nonnegative().optional(),
});

export const listPaymentsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(PAYMENT_STATUSES).optional(),
  orderId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const refundPaymentSchema = z.object({
  refundAmount: z.coerce.number().positive(),
  refundId: z.string().optional(),
});
