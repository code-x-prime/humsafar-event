import { z } from 'zod';

const ORDER_STATUSES = [
  'PENDING_PAYMENT',
  'CONFIRMED',
  'ASSIGNED',
  'IN_PROGRESS',
  'COMPLETED',
  'CANCELLED',
  'REFUNDED',
];

export const createOrderSchema = z.object({
  userId: z.string(),
  eventDate: z.coerce.date(),
  timeSlotId: z.string().optional(),
  cityId: z.string(),
  addressSnapshot: z.record(z.string(), z.any()),
  subtotal: z.coerce.number().nonnegative(),
  addOnTotal: z.coerce.number().nonnegative().optional(),
  deliveryCharge: z.coerce.number().nonnegative().optional(),
  surgeCharge: z.coerce.number().nonnegative().optional(),
  couponCode: z.string().optional(),
  discount: z.coerce.number().nonnegative().optional(),
  taxAmount: z.coerce.number().nonnegative().optional(),
  total: z.coerce.number().nonnegative(),
  paymentMode: z.enum(['FULL', 'ADVANCE']).optional(),
  customerNote: z.string().optional(),
  adminNote: z.string().optional(),
});

export const updateOrderSchema = z.object({
  status: z.enum(ORDER_STATUSES).optional(),
  timeSlotId: z.string().optional(),
  assignedStaffId: z.string().optional(),
  adminNote: z.string().optional(),
  cancelReason: z.string().optional(),
});

export const listOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(ORDER_STATUSES).optional(),
  cityId: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const updateOrderStatusSchema = z.object({
  status: z.enum(ORDER_STATUSES),
  cancelReason: z.string().optional(),
});
