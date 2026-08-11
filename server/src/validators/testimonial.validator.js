import { z } from 'zod';

export const createTestimonialSchema = z.object({
  name: z.string().min(1),
  city: z.string().optional(),
  message: z.string().min(1),
  image: z.string().optional(),
  imageR2Key: z.string().optional(),
  rating: z.coerce.number().min(0.5).max(5).multipleOf(0.5).optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateTestimonialSchema = createTestimonialSchema.partial();

export const listTestimonialsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleTestimonialSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderTestimonialsSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
