import { z } from 'zod';

export const createGalleryImageSchema = z.object({
  image: z.string().min(1),
  imageR2Key: z.string().optional(),
  title: z.string().optional(),
  showOnHome: z.boolean().optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateGalleryImageSchema = createGalleryImageSchema.partial();

export const toggleGalleryImageSchema = z.object({
  field: z.enum(['isActive', 'showOnHome']),
  value: z.boolean(),
});

export const reorderGalleryImagesSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
