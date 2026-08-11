import { z } from 'zod';

export const createUserSchema = z.object({
  name: z.string().min(1).optional(),
  email: z.string().email().optional(),
  phone: z.string().min(6).optional(),
  isActive: z.boolean().optional(),
});

export const updateUserSchema = createUserSchema.partial();

export const listUsersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleUserSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});
