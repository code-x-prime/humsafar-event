import { z } from 'zod';

export const createAddressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().min(10),
  line1: z.string().min(1),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  cityId: z.string().min(1),
  pincode: z.string().min(4),
  lat: z.coerce.number().optional(),
  lng: z.coerce.number().optional(),
  isDefault: z.boolean().optional(),
});

export const updateAddressSchema = createAddressSchema.partial();
