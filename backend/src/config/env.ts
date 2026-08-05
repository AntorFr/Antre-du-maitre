import { config as loadEnv } from 'dotenv';
import { fileURLToPath } from 'node:url';
import { z } from 'zod';

loadEnv({
  path: fileURLToPath(new URL('../../../.env', import.meta.url)),
});

const envSchema = z.object({
  DATABASE_URL: z.string().min(1),
  ANTHROPIC_API_KEY: z.string().optional(),
  ANTHROPIC_MODEL: z.string().min(1).default('claude-sonnet-4-6'),
  JWT_SECRET: z.string().min(16),
  PORT: z.coerce.number().int().positive().default(3001),
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  LLM_PROVIDER: z.enum(['mock', 'anthropic', 'claude-agent']).default('mock'),
  LLM_ERROR_LOG_DIR: z.string().min(1).optional(),
  OIDC_ISSUER: z.string().url().optional(),
  OIDC_CLIENT_ID: z.string().min(1).optional(),
  OIDC_CLIENT_SECRET: z.string().min(1).optional(),
  OIDC_REDIRECT_URI: z.string().url().optional(),
  OIDC_ADMIN_GROUP: z.string().min(1).default('parents'),
});

export const env = envSchema.parse(process.env);
