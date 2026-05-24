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
  LLM_PROVIDER: z.enum(['mock', 'anthropic']).default('mock'),
  LLM_ERROR_LOG_DIR: z.string().min(1).optional(),
});

export const env = envSchema.parse(process.env);
