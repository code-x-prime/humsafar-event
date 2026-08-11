import { z } from 'zod';

export const createStaffSchema = z.object({
  name: z.string().min(1),
  email: z.string().email(),
  phone: z.string().min(6).optional(),
  password: z.string().min(8),
  role: z.enum(['ADMIN', 'MANAGER', 'SUPPORT']),
  isActive: z.boolean().optional(),
});

export const updateStaffSchema = createStaffSchema.partial().omit({ password: true }).extend({
  password: z.string().min(8).optional(),
});

export const listStaffQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  role: z.enum(['ADMIN', 'MANAGER', 'SUPPORT']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleStaffSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});
