import 'dotenv/config';
import { z } from 'zod';

const envSchema = z.object({
  NODE_ENV: z.enum(['development', 'production', 'test']).default('development'),
  PORT: z.coerce.number().int().positive().default(4000),
  DATABASE_URL: z.string().min(1, 'DATABASE_URL is required'),

  ACCESS_JWT_SECRET: z.string().min(16, 'ACCESS_JWT_SECRET must be at least 16 characters'),
  ACCESS_TOKEN_LIFE: z.string().default('7d'),
  REFRESH_TOKEN_SECRET: z.string().min(16, 'REFRESH_TOKEN_SECRET must be at least 16 characters'),
  REFRESH_TOKEN_LIFE: z.string().default('7d'),
  ADMIN_JWT_SECRET: z.string().min(16, 'ADMIN_JWT_SECRET must be at least 16 characters'),
  ADMIN_TOKEN_LIFE: z.string().default('12h'),

  ENCRYPTION_KEY: z
    .string()
    .regex(/^[0-9a-fA-F]{64}$/, 'ENCRYPTION_KEY must be a 64-character hex string (32 bytes)'),

  CLIENT_ORIGIN: z.string().url().default('http://localhost:3000'),
  CLIENT_ORIGIN_WWW: z.string().url().optional(),
  ADMIN_ORIGIN: z.string().url().default('http://localhost:5173'),

  TIMEZONE: z.string().default('Asia/Kolkata'),
});

const parsed = envSchema.safeParse(process.env);

if (!parsed.success) {
  const issues = parsed.error.issues
    .map((issue) => `  - ${issue.path.join('.')}: ${issue.message}`)
    .join('\n');
  // eslint-disable-next-line no-console
  console.error(`Invalid environment configuration:\n${issues}`);
  process.exit(1);
}

export const env = parsed.data;
