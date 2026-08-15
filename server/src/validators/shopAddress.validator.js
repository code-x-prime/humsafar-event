import { z } from 'zod';

export const createShopAddressSchema = z.object({
  label: z.string().optional(),
  fullName: z.string().min(1),
  phone: z.string().min(10),
  line1: z.string().min(1),
  line2: z.string().optional(),
  landmark: z.string().optional(),
  city: z.string().min(1),
  state: z.string().min(1),
  pincode: z.string().min(4).max(10),
  isDefault: z.boolean().optional(),
});

export const updateShopAddressSchema = createShopAddressSchema.partial();
