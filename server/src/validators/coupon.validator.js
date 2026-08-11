import { z } from 'zod';

export const createCouponSchema = z.object({
  code: z.string().min(1),
  type: z.enum(['PERCENTAGE', 'FLAT']),
  value: z.coerce.number().nonnegative(),
  maxDiscount: z.coerce.number().nonnegative().optional(),
  minOrderValue: z.coerce.number().nonnegative().optional(),
  usageLimit: z.coerce.number().int().positive().optional(),
  perUserLimit: z.coerce.number().int().positive().optional(),
  newUserOnly: z.boolean().optional(),
  minRepeatOrders: z.coerce.number().int().positive().optional(),
  windowStart: z.coerce.date().optional(),
  windowEnd: z.coerce.date().optional(),
  applicableCategoryIds: z.array(z.string()).optional(),
  applicableCityIds: z.array(z.string()).optional(),
  isActive: z.boolean().optional(),
});

export const updateCouponSchema = createCouponSchema.partial().omit({ code: true });

export const listCouponsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  type: z.enum(['PERCENTAGE', 'FLAT']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleCouponSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});
