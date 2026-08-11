import { z } from 'zod';

export const createBannerSchema = z.object({
  title: z.string().optional(),
  subtitle: z.string().optional(),
  ctaText: z.string().optional(),
  ctaLink: z.string().optional(),
  desktopImageR2Key: z.string().optional(),
  desktopImageUrl: z.string().optional(),
  mobileImageR2Key: z.string().optional(),
  mobileImageUrl: z.string().optional(),
  placement: z.enum(['HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'OFFER_POPUP']),
  refId: z.string().optional(),
  cityId: z.string().optional(),
  position: z.coerce.number().int().optional(),
  startsAt: z.coerce.date().optional(),
  endsAt: z.coerce.date().optional(),
  isActive: z.boolean().optional(),
});

export const updateBannerSchema = createBannerSchema.partial();

export const listBannersQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  placement: z.enum(['HOME_HERO', 'HOME_STRIP', 'CATEGORY_TOP', 'OFFER_POPUP']).optional(),
  isActive: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleBannerSchema = z.object({
  field: z.enum(['isActive']),
  value: z.boolean(),
});

export const reorderBannersSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
