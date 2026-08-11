import { z } from 'zod';

export const createMediaSchema = z.object({
  r2Key: z.string().min(1),
  url: z.string().min(1),
  folder: z.string().optional(),
  mime: z.string().optional(),
  size: z.coerce.number().int().optional(),
  width: z.coerce.number().int().optional(),
  height: z.coerce.number().int().optional(),
});

export const updateMediaSchema = createMediaSchema.partial();

export const listMediaQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  folder: z.string().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const presignSchema = z.object({
  folder: z.string().min(1),
  filename: z.string().min(1),
  contentType: z.string().min(1),
  size: z.coerce.number().int().positive().optional(),
});

export const confirmUploadSchema = z.object({
  r2Key: z.string().min(1),
  url: z.string().min(1),
  folder: z.string().optional(),
  mime: z.string().optional(),
  size: z.coerce.number().int().optional(),
  width: z.coerce.number().int().optional(),
  height: z.coerce.number().int().optional(),
});
