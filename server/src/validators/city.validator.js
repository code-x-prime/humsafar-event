import { z } from 'zod';

export const createCitySchema = z.object({
  name: z.string().min(1),
  state: z.string().optional(),
  slug: z.string().min(1).optional(),
  region: z.string().optional(),
  isServiceable: z.boolean().optional(),
  comingSoon: z.boolean().optional(),
  deliveryCharge: z.coerce.number().nonnegative().optional(),
  minOrderValue: z.coerce.number().nonnegative().optional(),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
});

export const updateCitySchema = createCitySchema.partial();

export const listCitiesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  region: z.string().optional(),
  isServiceable: z.coerce.boolean().optional(),
  sortBy: z.string().optional(),
  sortOrder: z.enum(['asc', 'desc']).optional(),
});

export const toggleCitySchema = z.object({
  field: z.enum(['isServiceable', 'comingSoon']),
  value: z.boolean(),
});

export const reorderCitiesSchema = z.object({
  items: z.array(z.object({ id: z.string(), position: z.number().int() })).min(1),
});
