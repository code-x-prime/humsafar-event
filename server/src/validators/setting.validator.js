import { z } from 'zod';

export const settingsGroupParamSchema = z.object({
  group: z.enum(['general', 'contact', 'social', 'seo', 'payment', 'storage', 'email', 'business_rules']),
});

// Group payloads are free-form key/value (each group has different fields) —
// validated loosely here; the service layer decides which fields are secret.
export const saveGroupSchema = z.record(z.string(), z.any());
