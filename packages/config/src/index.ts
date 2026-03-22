import { z } from 'zod';

const boolFromEnv = z.preprocess(
  (v) => v === 'true' || v === '1' || v === true,
  z.boolean()
);

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  API_URL: z.string().url().optional(),
  LIVE_MODE_ENABLED: boolFromEnv.default(false),
  ALLOW_DEV_SIGNER: boolFromEnv.default(false),
  MOCK_DEX_SPREAD_BPS: z.coerce.number().optional(),
  MOCK_DEX_FEE_BPS: z.coerce.number().optional(),
  MOCK_DEX_FAILURE_RATE: z.coerce.number().min(0).max(1).optional(),
  MOCK_ANCHOR_SETTLEMENT_DELAY_MS: z.coerce.number().optional(),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export { QUEUE_NAMES } from './queues.js';

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  return parsed.data;
}
