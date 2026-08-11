// Dashboard has no create/update payloads — this file exists for pattern
// consistency but currently exports nothing. Kept as a placeholder in case
// date-range query params are added later.
import { z } from 'zod';

export const dashboardQuerySchema = z.object({});
