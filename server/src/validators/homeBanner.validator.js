import { z } from 'zod';

export const createHomeBannerSchema = z.object({
  desktopImage: z.string().min(1),
  desktopImageR2Key: z.string().optional(),
  mobileImage: z.string().optional(),
  mobileImageR2Key: z.string().optional(),
  heading: z.string().optional(),
  subtitle: z.string().optional(),
  buttonText: z.string().optional(),
  link: z.string().optional(),
  isActive: z.boolean().optional(),
  position: z.coerce.number().int().optional(),
});

export const updateHomeBannerSchema = createHomeBannerSchema.partial();

export const toggleHomeBannerSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderHomeBannersSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
