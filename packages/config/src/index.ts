import { z } from 'zod';

const boolFromEnv = z.preprocess((v) => v === 'true' || v === '1' || v === true, z.boolean());

const keetaNetwork = z.enum(['main', 'staging', 'test', 'dev']).default('test');

const EnvSchema = z.object({
  NODE_ENV: z.enum(['development', 'test', 'production']).default('development'),
  DATABASE_URL: z.string().min(1),
  REDIS_URL: z.string().min(1),
  API_PORT: z.coerce.number().default(3001),
  LOG_LEVEL: z.enum(['fatal', 'error', 'warn', 'info', 'debug', 'trace']).default('info'),
  OTEL_ENABLED: boolFromEnv.default(false),
  OTEL_CONSOLE_EXPORTER: boolFromEnv.default(false),
  OTEL_SERVICE_NAME: z.string().min(1).optional(),
  OTEL_EXPORTER_OTLP_ENDPOINT: z.string().url().optional(),
  API_URL: z.string().url().optional(),
  API_RATE_LIMIT_MAX: z.coerce.number().int().min(1).default(500),
  API_RATE_LIMIT_WINDOW_MS: z.coerce.number().int().min(1_000).default(60_000),
  API_RATE_LIMIT_ALLOWLIST: z
    .string()
    .optional()
    .transform(
      (value) =>
        value
          ?.split(',')
          .map((entry) => entry.trim())
          .filter(Boolean) ?? []
    ),
  API_CORS_ORIGINS: z
    .string()
    .optional()
    .transform(
      (value) =>
        value
          ?.split(',')
          .map((entry) => entry.trim())
          .filter(Boolean) ?? []
    ),
  API_SWAGGER_TRY_IT_OUT_ENABLED: boolFromEnv.optional(),
  LIVE_MODE_ENABLED: boolFromEnv.default(false),
  ALLOW_DEV_SIGNER: boolFromEnv.default(false),
  MOCK_DEX_SPREAD_BPS: z.coerce.number().optional(),
  MOCK_DEX_FEE_BPS: z.coerce.number().optional(),
  MOCK_DEX_FAILURE_RATE: z.coerce.number().min(0).max(1).optional(),
  MOCK_ANCHOR_SETTLEMENT_DELAY_MS: z.coerce.number().optional(),
  /** Keeta network alias for @keetanetwork/keetanet-client Client/UserClient */
  KEETA_NETWORK: keetaNetwork,
  /** Hex seed for the signing account — worker only; required for live native transfers */
  KEETA_SIGNING_SEED: z.string().min(1).optional(),
  KEETA_ACCOUNT_INDEX: z.coerce.number().int().min(0).default(0),
  /** Optional BYOK signer backend for worker live signing. */
  KEETA_KMS_PROVIDER: z.enum(['gcp']).optional(),
  /** GCP Cloud KMS key resource name for KMS-backed worker signing. */
  KEETA_KMS_KEY: z.string().min(1).optional(),
  /** Standard Google auth path used by @google-cloud/kms at runtime. */
  GOOGLE_APPLICATION_CREDENTIALS: z.string().min(1).optional(),
  /** Optional printf-style template with `{hash}` for explorer links (network-specific) */
  KEETA_EXPLORER_TX_URL_TEMPLATE: z.string().min(1).optional(),
  /** KTA-Oracle HTTP base URL for rate/compliance integrations. */
  KTA_ORACLE_BASE_URL: z.string().url().default('https://kta-oracle.vercel.app'),
  KTA_ORACLE_TIMEOUT_MS: z.coerce.number().int().min(500).default(10_000),
  /** When true, policy evaluation requires Keeta preflight hints (see policy rule) */
  KEETA_POLICY_ENABLED: boolFromEnv.default(false),
  /** When true, policy requires identity metadata on intents (agentId / attestation / cert fingerprint) */
  IDENTITY_POLICY_ENABLED: boolFromEnv.default(false),
  /** Block live execution at worker start (env kill switch). */
  EXECUTION_KILL_SWITCH: boolFromEnv.default(false),
  /** Optional shared secret for GET /ops/metrics and admin routes. */
  OPS_API_KEY: z.string().min(1).optional(),
  /** Optional fallback policy-pack id used when no intent or wallet selector is present. */
  DEFAULT_POLICY_PACK_ID: z.string().uuid().optional(),
  /** Admin token for policy evaluate bypass (audited). */
  ADMIN_BYPASS_TOKEN: z.string().min(1).optional(),
  /** Symmetric JWT secret for operator/admin API access. */
  AUTH_JWT_SECRET: z.string().min(1).optional(),
  /** Optional PEM public key for asymmetric JWT validation. */
  AUTH_JWT_PUBLIC_KEY_PEM: z.string().min(1).optional(),
  /** Optional remote JWKS URL for asymmetric JWT validation. */
  AUTH_JWT_JWKS_URL: z.string().url().optional(),
  /** Optional OIDC discovery document URL used to resolve issuer and JWKS metadata. */
  AUTH_JWT_OIDC_DISCOVERY_URL: z.string().url().optional(),
  /** Optional OIDC issuer URL used to derive /.well-known/openid-configuration. */
  AUTH_JWT_OIDC_ISSUER: z.string().url().optional(),
  /** Optional JWT issuer validation. */
  AUTH_JWT_ISSUER: z.string().min(1).optional(),
  /** Optional comma-separated JWT audience allowlist. */
  AUTH_JWT_AUDIENCE: z
    .string()
    .optional()
    .transform(
      (value) =>
        value
          ?.split(',')
          .map((entry) => entry.trim())
          .filter(Boolean) ?? []
    ),
  /** Timeout for remote JWKS / OIDC metadata fetches (ms). */
  AUTH_JWT_REMOTE_TIMEOUT_MS: z.coerce.number().int().min(500).default(5_000),
  /** Allow legacy x-ops-key fallback outside local integration scenarios. */
  AUTH_ALLOW_LEGACY_OPS_API_KEY: boolFromEnv.default(false),
  /**
   * Role granted to callers authenticating via the legacy `x-ops-key` header.
   * Defaults to `operator` (least-privilege). Explicit opt-in to `admin` is required for old
   * deployments that still rely on the legacy key for admin routes.
   */
  AUTH_LEGACY_OPS_API_KEY_ROLE: z.enum(['operator', 'admin']).default('operator'),
  /**
   * Explicitly allow `ADMIN_BYPASS_TOKEN` to grant admin access in production. Defaults to
   * false; in production the bypass token must be explicitly enabled (disables silently in
   * `NODE_ENV=production`). Development and test environments always allow it when set.
   */
  AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION: boolFromEnv.default(false),
  /** Enable Prometheus-compatible metrics export. */
  METRICS_ENABLED: boolFromEnv.default(true),
  /** Require authenticated operator/admin access for /metrics. */
  METRICS_REQUIRE_AUTH: boolFromEnv.default(true),
  /** Require lock reference-backed anchor bond verification for live anchor routes. */
  ANCHOR_BOND_STRICT: boolFromEnv.default(false),
  /** Periodic bond refresh interval (worker schedules BullMQ repeat job). */
  ANCHOR_BOND_RECONCILE_INTERVAL_MS: z.coerce.number().int().min(10_000).default(180_000),
  /** Number of anchors to inspect per reconciliation tick. */
  ANCHOR_BOND_RECONCILE_BATCH_SIZE: z.coerce.number().int().min(1).max(5_000).default(250),
  /** Reconciliation repeat interval (worker schedules BullMQ repeat job). */
  RECONCILE_INTERVAL_MS: z.coerce.number().int().min(10_000).default(300_000),
  METRICS_INTERVAL_MS: z.coerce.number().int().min(10_000).default(60_000),
  STUCK_JOB_SWEEP_INTERVAL_MS: z.coerce.number().int().min(30_000).default(120_000),
  STUCK_JOB_AGE_MS: z.coerce.number().int().min(60_000).default(600_000),
  /** How often the operator-metrics aggregation job runs (ms). */
  OPERATOR_METRICS_INTERVAL_MS: z.coerce.number().int().min(10_000).default(300_000),
  /** TTL for operator metrics in the Redis cache (ms). Determines staleness at routing time. */
  OPERATOR_METRICS_TTL_MS: z.coerce.number().int().min(5_000).default(300_000),
  /** p95 settlement latency above which an anchor receives a latency penalty (ms). */
  OPERATOR_LATENCY_P95_THRESHOLD_MS: z.coerce.number().int().min(1_000).default(30_000),
  /** Success rate below which an anchor receives a penalty (0–100). Block threshold is 80. */
  OPERATOR_SUCCESS_RATE_MIN_PCT: z.coerce.number().min(0).max(100).default(95),
  /** How often the worker scans audit events and dispatches webhook deliveries (ms). */
  WEBHOOK_DELIVERY_INTERVAL_MS: z.coerce.number().int().min(1_000).default(5_000),
  /** Max fresh events / due deliveries processed per webhook fanout tick. */
  WEBHOOK_DELIVERY_BATCH_SIZE: z.coerce.number().int().min(1).max(1_000).default(100),
  /** Max delivery attempts before a webhook is left failed with no further retries. */
  WEBHOOK_DELIVERY_MAX_ATTEMPTS: z.coerce.number().int().min(1).max(50).default(5),
  /** How long shutdown waits for workers and queues before logging and moving on (ms). */
  WORKER_SHUTDOWN_TIMEOUT_MS: z.coerce.number().int().min(1_000).default(30_000),
});

export type AppEnv = z.infer<typeof EnvSchema>;

export { QUEUE_NAMES } from './queues.js';
export { getDefaultJobOptions, getWorkerOptions } from './bullmq.js';

export function loadEnv(env: NodeJS.ProcessEnv = process.env): AppEnv {
  const parsed = EnvSchema.safeParse(env);
  if (!parsed.success) {
    const msg = parsed.error.flatten().fieldErrors;
    throw new Error(`Invalid environment: ${JSON.stringify(msg)}`);
  }
  if (parsed.data.NODE_ENV === 'production' && parsed.data.ALLOW_DEV_SIGNER) {
    throw new Error('Invalid environment: ALLOW_DEV_SIGNER must be false in production');
  }
  return parsed.data;
}
