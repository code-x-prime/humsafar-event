import { z } from 'zod';

const SHOP_ORDER_STATUSES = ['PENDING_PAYMENT', 'CONFIRMED', 'SHIPPED', 'DELIVERED', 'CANCELLED', 'REFUNDED'];

export const updateShopOrderSchema = z.object({
  adminNote: z.string().optional(),
  cancelReason: z.string().optional(),
});

export const listShopOrdersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  status: z.enum(SHOP_ORDER_STATUSES).optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const updateShopOrderStatusSchema = z.object({
  status: z.enum(SHOP_ORDER_STATUSES),
  cancelReason: z.string().optional(),
});

export const assignCourierSchema = z.object({
  courierId: z.coerce.number().int().optional(),
});
