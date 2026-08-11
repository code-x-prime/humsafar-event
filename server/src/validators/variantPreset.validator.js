import { z } from 'zod';

const optionSchema = z.object({
  name: z.string().min(1),
  swatches: z.array(z.string()).optional(),
});

export const createVariantPresetSchema = z.object({
  name: z.string().min(1),
  options: z.array(optionSchema).min(1),
});

export const updateVariantPresetSchema = createVariantPresetSchema.partial();
