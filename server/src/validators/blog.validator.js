import { z } from 'zod';

export const createBlogSchema = z.object({
  title: z.string().min(1),
  slug: z.string().min(1).optional(),
  content: z.string().min(1),
  coverImage: z.string().optional(),
  isPublished: z.boolean().optional(),
});

export const updateBlogSchema = createBlogSchema.partial();

export const listBlogsQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  isPublished: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleBlogSchema = z.object({
  field: z.enum(['isPublished']),
  value: z.boolean(),
});
