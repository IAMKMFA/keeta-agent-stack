/**
 * Runtime classification.
 *
 * Each runtime has different custody privileges:
 *
 * | Runtime    | May hold signing seed / KMS key | May hold OPS_API_KEY  | Browser bundle? |
 * | ---------- | ------------------------------- | --------------------- | --------------- |
 * | worker     | Yes                             | No                    | No              |
 * | api        | No                              | Yes (server-side)     | No              |
 * | mcp        | Conditional (MCP_ALLOW_INLINE_SEEDS) | Yes (server-side) | No              |
 * | dashboard  | No                              | Yes (server-only env) | Server-only env |
 * | web        | No                              | No                    | Server-only env |
 * | sdk        | No                              | No                    | n/a (library)   |
 * | test       | Yes (test fixtures only)        | Yes (test fixtures)   | n/a             |
 * | unknown    | No (fail closed)                | No (fail closed)      | n/a             |
 */
export type RuntimeKind =
  | 'worker'
  | 'api'
  | 'mcp'
  | 'dashboard'
  | 'web'
  | 'sdk'
  | 'test'
  | 'unknown';

/**
 * Canonical env var the application sets at the top of `apps/*` entrypoints
 * (e.g. `process.env.KEETA_RUNTIME = 'worker'`). When absent, the classifier
 * falls back to a conservative best-effort detection — never to `worker`.
 */
export const KEETA_RUNTIME_ENV = 'KEETA_RUNTIME';

const VALID_RUNTIMES = new Set<RuntimeKind>([
  'worker',
  'api',
  'mcp',
  'dashboard',
  'web',
  'sdk',
  'test',
  'unknown',
]);

function isRuntimeKind(value: string): value is RuntimeKind {
  return VALID_RUNTIMES.has(value as RuntimeKind);
}

/**
 * Classify the current runtime. Honors (in order):
 *   1. Explicit `KEETA_RUNTIME` env var.
 *   2. Standard test indicators (`VITEST`, `JEST_WORKER_ID`, `NODE_ENV=test`).
 *   3. Returns `'unknown'` so guard checks fail closed.
 */
export function detectRuntime(env: NodeJS.ProcessEnv = process.env): RuntimeKind {
  const explicit = env[KEETA_RUNTIME_ENV];
  if (typeof explicit === 'string' && explicit.length > 0) {
    const normalized = explicit.trim().toLowerCase();
    if (isRuntimeKind(normalized)) {
      return normalized;
    }
  }

  if (env.VITEST === 'true' || typeof env.JEST_WORKER_ID === 'string') {
    return 'test';
  }

  if (env.NODE_ENV === 'test') {
    return 'test';
  }

  return 'unknown';
}

/**
 * Sets the runtime on the current process. Intended for `apps/*` entrypoints
 * to call once at boot, before any `@keeta-agent-stack/keeta` signer surface
 * is touched.
 *
 * Idempotent: returns the existing runtime if already set, regardless of the
 * argument, to make double-imports during dev-mode HMR safe.
 */
export function declareRuntime(
  kind: Exclude<RuntimeKind, 'unknown'>,
  env: NodeJS.ProcessEnv = process.env
): RuntimeKind {
  const existing = env[KEETA_RUNTIME_ENV];
  if (typeof existing === 'string' && existing.length > 0) {
    const normalized = existing.trim().toLowerCase();
    if (isRuntimeKind(normalized) && normalized !== 'unknown') {
      return normalized;
    }
  }
  env[KEETA_RUNTIME_ENV] = kind;
  return kind;
}
