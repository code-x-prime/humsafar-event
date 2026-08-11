import { z } from 'zod';

const CODE_RE = /^\d{6}$/;

export const createPincodeSchema = z.object({
  code: z.string().regex(CODE_RE, 'Pincode must be 6 digits'),
  cityId: z.string().min(1),
  areaName: z.string().optional(),
  isServiceable: z.boolean().optional(),
  extraDeliveryCharge: z.coerce.number().nonnegative().optional(),
});

export const updatePincodeSchema = createPincodeSchema.partial().omit({ cityId: true }).extend({
  cityId: z.string().min(1).optional(),
});

export const listPincodesQuerySchema = z.object({
  page: z.coerce.number().int().positive().optional(),
  limit: z.coerce.number().int().positive().optional(),
  search: z.string().optional(),
  cityId: z.string().optional(),
  isServiceable: z.coerce.boolean().optional(),
});

export const bulkRangeSchema = z
  .object({
    cityId: z.string().min(1),
    from: z.string().regex(CODE_RE),
    to: z.string().regex(CODE_RE),
  })
  .refine((data) => Number(data.to) >= Number(data.from), {
    message: '`to` must be greater than or equal to `from`',
    path: ['to'],
  })
  .refine((data) => Number(data.to) - Number(data.from) < 5000, {
    message: 'Range too large (max 5000 pincodes at a time)',
    path: ['to'],
  });

export const bulkToggleSchema = z.object({
  ids: z.array(z.string()).min(1),
  isServiceable: z.boolean(),
});

export const bulkDeleteSchema = z.object({
  ids: z.array(z.string()).min(1),
});
