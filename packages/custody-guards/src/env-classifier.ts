/**
 * Env-var classification: which runtimes may legitimately read a given env
 * var, and whether the variable can ever be public-safe in a browser bundle.
 *
 * The source of truth for the human-readable mapping lives in
 * `docs/security/SECRET_BOUNDARY_MAP.md`. This module encodes the subset of
 * those rules that need machine enforcement (boot-time guards, lint helpers,
 * unit tests).
 */

import type { RuntimeKind } from './runtime.js';

/**
 * What kind of secret material a var carries:
 *
 *   - `signing`         — Keeta seed / KMS key. Worker-only.
 *   - `admin-credential` — operator/admin auth (`OPS_API_KEY`, JWT secret,
 *                         admin bypass). API and dashboard server may hold
 *                         it; never the browser, never `apps/web` source.
 *   - `partner-secret`  — outbound webhook/HMAC keys, partner rail credentials.
 *   - `public-config`   — non-sensitive URL/feature flag.
 *   - `internal-config` — operational tuning (timeouts, intervals) that is
 *                         not strictly secret but that we keep server-side
 *                         to avoid revealing topology.
 *   - `unknown`         — name does not match any classifier pattern.
 */
export type EnvVarClass =
  | 'signing'
  | 'admin-credential'
  | 'partner-secret'
  | 'public-config'
  | 'internal-config'
  | 'unknown';

export interface EnvVarSafety {
  /** Stable classification used by guards and the docs claim map. */
  readonly class: EnvVarClass;
  /** Runtimes that may legitimately read this var. Empty = anyone (public-config). */
  readonly allowedRuntimes: ReadonlyArray<RuntimeKind>;
  /** True iff the var may appear in a browser bundle. Always false for secrets. */
  readonly browserSafe: boolean;
  /**
   * True iff the var name uses the `NEXT_PUBLIC_*` prefix. Vars in this
   * namespace are *always* shipped to the browser by Next.js, so any secret
   * with this prefix is automatically rejected.
   */
  readonly nextPublicPrefix: boolean;
  /** Optional human-readable mitigation note. */
  readonly notes?: string;
}

const SIGNING_NAMES = new Set([
  'KEETA_SIGNING_SEED',
  'KEETA_KMS_PROVIDER',
  'KEETA_KMS_KEY',
  'KEETA_ACCOUNT_INDEX',
  'GOOGLE_APPLICATION_CREDENTIALS',
]);

const ADMIN_CRED_NAMES = new Set([
  'OPS_API_KEY',
  'ADMIN_BYPASS_TOKEN',
  'AUTH_JWT_SECRET',
  'AUTH_JWT_PUBLIC_KEY_PEM',
  'AUTH_JWT_JWKS_URL',
  'AUTH_JWT_OIDC_DISCOVERY_URL',
  'AUTH_JWT_OIDC_ISSUER',
  'AUTH_JWT_ISSUER',
  'AUTH_JWT_AUDIENCE',
  'AUTH_ALLOW_LEGACY_OPS_API_KEY',
  'AUTH_LEGACY_OPS_API_KEY_ROLE',
  'AUTH_ALLOW_ADMIN_BYPASS_IN_PRODUCTION',
  'INTEGRATION_OPS_API_KEY',
  'MCP_ALLOW_INLINE_SEEDS',
  'DASHBOARD_DEV_VIEWER_ROLE',
]);

const PARTNER_SECRET_NAMES = new Set(['WEBHOOK_SECRET', 'ORACLE_RAIL_CCTP_LIVE_URL']);

const PUBLIC_CONFIG_NAMES = new Set([
  'NEXT_PUBLIC_API_URL',
  'NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE',
  'KEETA_NETWORK',
  'KEETA_EXPLORER_TX_URL_TEMPLATE',
  'KTA_ORACLE_BASE_URL',
  'API_URL',
]);

const INTERNAL_CONFIG_NAMES = new Set([
  'KTA_ORACLE_TIMEOUT_MS',
  'AUTH_JWT_REMOTE_TIMEOUT_MS',
  'API_PORT',
  'API_RATE_LIMIT_MAX',
  'API_RATE_LIMIT_WINDOW_MS',
  'API_RATE_LIMIT_ALLOWLIST',
  'API_CORS_ORIGINS',
  'API_SWAGGER_TRY_IT_OUT_ENABLED',
  'LOG_LEVEL',
  'LOG_REDACT_EXTRA',
  'TELEMETRY_EXTRA_REDACT_PATHS',
  'NODE_ENV',
  'LIVE_MODE_ENABLED',
  'ALLOW_DEV_SIGNER',
  'EXECUTION_KILL_SWITCH',
  'KEETA_POLICY_ENABLED',
  'IDENTITY_POLICY_ENABLED',
  'ANCHOR_BOND_STRICT',
  'MOCK_ADAPTERS',
  'DASHBOARD_V2_ENABLED',
  'METRICS_ENABLED',
  'METRICS_REQUIRE_AUTH',
  'OTEL_ENABLED',
  'OTEL_CONSOLE_EXPORTER',
  'OTEL_SERVICE_NAME',
  'OTEL_EXPORTER_OTLP_ENDPOINT',
  'DATABASE_URL',
  'REDIS_URL',
  'INTEGRATION_DATABASE_URL',
  'INTEGRATION_REDIS_URL',
  'INTEGRATION_DATABASE_NAME',
  'INTEGRATION_ADMIN_DATABASE_URL',
  'KEETA_AGENT_API_URL',
]);

/**
 * Classify a single env var by name. Returns the safety record described
 * above. Unknown names default to `'unknown'` with a conservative
 * `browserSafe: false` so callers fail closed.
 */
export function classifyEnvVarSafety(name: string): EnvVarSafety {
  const nextPublicPrefix = name.startsWith('NEXT_PUBLIC_');

  if (SIGNING_NAMES.has(name)) {
    return {
      class: 'signing',
      allowedRuntimes: ['worker', 'test'],
      browserSafe: false,
      nextPublicPrefix,
      notes:
        'Worker-only. MCP may hold KEETA_SIGNING_SEED if and only if operators accept the documented co-signer trade-off.',
    };
  }

  if (ADMIN_CRED_NAMES.has(name)) {
    const allowed: RuntimeKind[] =
      name === 'MCP_ALLOW_INLINE_SEEDS'
        ? ['mcp', 'test']
        : name === 'DASHBOARD_DEV_VIEWER_ROLE'
          ? ['dashboard', 'test']
          : ['api', 'mcp', 'dashboard', 'test'];
    return {
      class: 'admin-credential',
      allowedRuntimes: allowed,
      browserSafe: false,
      nextPublicPrefix,
      notes: 'Server-side only. Never proxy via NEXT_PUBLIC_* and never embed in component props.',
    };
  }

  if (PARTNER_SECRET_NAMES.has(name)) {
    return {
      class: 'partner-secret',
      allowedRuntimes: ['worker', 'api', 'test'],
      browserSafe: false,
      nextPublicPrefix,
      notes: 'Forwarded to partner rails server-side.',
    };
  }

  if (PUBLIC_CONFIG_NAMES.has(name)) {
    return {
      class: 'public-config',
      allowedRuntimes: [],
      browserSafe: true,
      nextPublicPrefix,
    };
  }

  if (INTERNAL_CONFIG_NAMES.has(name)) {
    return {
      class: 'internal-config',
      allowedRuntimes: [],
      browserSafe: false,
      nextPublicPrefix,
      notes: 'Operational tuning. Not strictly secret but keep server-side.',
    };
  }

  return {
    class: 'unknown',
    allowedRuntimes: [],
    browserSafe: false,
    nextPublicPrefix,
    notes:
      'Unknown env var. Default-deny: not browser-safe, not allowed in any runtime by guard checks.',
  };
}

/**
 * Names that match this regex are treated as secret-shaped even when their
 * exact name is not in the explicit allowlist. Used by the
 * `NEXT_PUBLIC_*` validator and the redactor as a belt-and-braces check.
 */
const SECRET_LIKE_NAME = /(KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL|SEED|MNEMONIC|PRIVATE|SIGNING)/i;

export function looksLikeSecretName(name: string): boolean {
  return SECRET_LIKE_NAME.test(name);
}
