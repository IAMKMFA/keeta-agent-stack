import { CustodyBoundaryError } from './errors.js';
import { classifyEnvVarSafety, looksLikeSecretName, type EnvVarSafety } from './env-classifier.js';
import { detectRuntime, type RuntimeKind } from './runtime.js';

/**
 * Runtimes that are allowed to materialise a Keeta signing `UserClient`.
 *
 * `worker` is the canonical path. `mcp` is allowed only when an operator has
 * explicitly opted in by setting `MCP_ALLOW_INLINE_SEEDS=true` AND the MCP
 * host is the one signing — see `assertNoInlineSeedUnlessExplicitlyAllowed`.
 *
 * `test` is permitted so unit tests can exercise the signer surface. Tests
 * must set `KEETA_RUNTIME=test` or run under Vitest/Jest (auto-detected).
 */
const SIGNING_RUNTIMES: ReadonlyArray<RuntimeKind> = ['worker', 'test'];

/**
 * Assert that the current process is allowed to perform Keeta signing.
 *
 * Wire this at the **innermost** signing boundary (the call site that
 * actually constructs the signing `UserClient`), not at app boot. Boot-time
 * checks would block read-only worker code paths that share the same module.
 *
 * Throws `CustodyBoundaryError({ code: 'WRONG_RUNTIME_FOR_SIGNING' })` when
 * the runtime is not allowed.
 */
export function assertWorkerSigningRuntime(env: NodeJS.ProcessEnv = process.env): RuntimeKind {
  const runtime = detectRuntime(env);
  if (!SIGNING_RUNTIMES.includes(runtime)) {
    throw new CustodyBoundaryError(
      'WRONG_RUNTIME_FOR_SIGNING',
      `Refusing to construct a Keeta signing client in runtime "${runtime}". ` +
        `Signing terminates in apps/worker. If you are wiring a new entrypoint, ` +
        `call declareRuntime('worker') before importing the signer surface, or run ` +
        `with KEETA_RUNTIME=worker in the process environment.`,
      { runtime, allowedRuntimes: [...SIGNING_RUNTIMES] }
    );
  }
  return runtime;
}

/**
 * Assert that no env var name carrying secret-shaped material is exposed to
 * a browser bundle. Two checks:
 *
 *   1. No `NEXT_PUBLIC_*` env name matches the secret-shape pattern (e.g.
 *      `NEXT_PUBLIC_OPS_API_KEY`). Next.js inlines every `NEXT_PUBLIC_*`
 *      var into the browser bundle, so a name like that is always a leak.
 *   2. No env var classified as `signing` / `admin-credential` /
 *      `partner-secret` is also marked `nextPublicPrefix`.
 *
 * Designed to be invoked at process boot in a single line:
 *
 *     assertNoBrowserSecretExposure(process.env);
 *
 * Throws `CustodyBoundaryError({ code: 'BROWSER_SECRET_EXPOSED' })`. Returns
 * the list of vars inspected on success for caller telemetry.
 */
export function assertNoBrowserSecretExposure(env: NodeJS.ProcessEnv = process.env): {
  inspected: number;
} {
  let inspected = 0;
  for (const name of Object.keys(env)) {
    inspected += 1;
    if (!name.startsWith('NEXT_PUBLIC_')) continue;

    const safety = classifyEnvVarSafety(name);
    const looksSecret = looksLikeSecretName(name);
    const isPrivilegedClass =
      safety.class === 'signing' ||
      safety.class === 'admin-credential' ||
      safety.class === 'partner-secret';

    if (looksSecret || isPrivilegedClass) {
      throw new CustodyBoundaryError(
        'BROWSER_SECRET_EXPOSED',
        `Refusing to boot: env var "${name}" uses the NEXT_PUBLIC_* prefix and is shaped like a secret. ` +
          `NEXT_PUBLIC_* vars are inlined into the browser bundle by Next.js. Move it to a server-only env var.`,
        { name, classification: safety }
      );
    }
  }
  return { inspected };
}

/**
 * MCP-specific guard. Throws `INLINE_SEED_DISALLOWED` when an inline `seed`
 * argument is present but `MCP_ALLOW_INLINE_SEEDS` is not explicitly enabled.
 *
 * Returns the seed to use (inline or env fallback). Returns `undefined` when
 * no seed is configured anywhere — callers can then choose a read-only path.
 *
 * This is the single source of truth that should back both
 * `apps/mcp/src/tools/execute.ts` and `apps/mcp/src/tools/anchor-chaining.ts`.
 */
export function assertNoInlineSeedUnlessExplicitlyAllowed(
  inlineSeed: string | undefined,
  env: NodeJS.ProcessEnv = process.env
): string | undefined {
  if (inlineSeed !== undefined) {
    if (!isInlineSeedFlagEnabled(env)) {
      throw new CustodyBoundaryError(
        'INLINE_SEED_DISALLOWED',
        'Inline seeds are disabled in this MCP deployment. Remove the `seed` argument or set MCP_ALLOW_INLINE_SEEDS=true (dev only).'
      );
    }
    return inlineSeed;
  }
  const fallback = env.KEETA_SIGNING_SEED;
  return typeof fallback === 'string' && fallback.length > 0 ? fallback : undefined;
}

/** True iff `MCP_ALLOW_INLINE_SEEDS` is one of the documented opt-in tokens. */
export function isInlineSeedFlagEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
  const v = env.MCP_ALLOW_INLINE_SEEDS;
  return v === 'true' || v === '1';
}

/**
 * Validate that a given env var name is acceptable for the `NEXT_PUBLIC_*`
 * namespace. Used by lint helpers.
 *
 * Returns `{ ok: true, safety }` when the var is browser-safe, otherwise
 * returns `{ ok: false, reason, safety }` so callers can render a helpful
 * lint diagnostic.
 */
export function validateNextPublicEnvName(
  name: string
): { ok: true; safety: EnvVarSafety } | { ok: false; reason: string; safety: EnvVarSafety } {
  if (!name.startsWith('NEXT_PUBLIC_')) {
    return {
      ok: false,
      reason: `validateNextPublicEnvName called with non-NEXT_PUBLIC_ name "${name}".`,
      safety: classifyEnvVarSafety(name),
    };
  }
  const safety = classifyEnvVarSafety(name);
  if (looksLikeSecretName(name)) {
    return {
      ok: false,
      reason: `Env name "${name}" uses NEXT_PUBLIC_* but matches the secret-shape pattern (KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL/SEED/MNEMONIC/PRIVATE/SIGNING).`,
      safety,
    };
  }
  if (
    safety.class === 'signing' ||
    safety.class === 'admin-credential' ||
    safety.class === 'partner-secret'
  ) {
    return {
      ok: false,
      reason: `Env name "${name}" classifies as "${safety.class}" — never browser-safe.`,
      safety,
    };
  }
  return { ok: true, safety };
}

/**
 * Hard-fail boot check for runtimes that are NEVER supposed to hold a given
 * env var. Used by API/dashboard/web entrypoints to assert that signing
 * material has not leaked into their environment.
 *
 * Example: `assertEnvNotPresentForRuntime('api', 'KEETA_SIGNING_SEED')`.
 *
 * Throws `PRIVILEGED_ENV_IN_NON_OWNER_RUNTIME` when the env var is present
 * AND the current runtime is not in the allowlist for that var. Allows the
 * `'unknown'` runtime to pass through (it's the boot-time default and would
 * otherwise produce false positives during ad-hoc scripts and `pnpm exec`).
 */
export function assertEnvNotPresentForRuntime(
  runtime: RuntimeKind,
  name: string,
  env: NodeJS.ProcessEnv = process.env
): void {
  const value = env[name];
  if (typeof value !== 'string' || value.length === 0) return;

  const safety = classifyEnvVarSafety(name);
  if (safety.allowedRuntimes.length === 0) return; // public-config / internal-config
  if (safety.allowedRuntimes.includes(runtime)) return;
  if (runtime === 'unknown') return;

  throw new CustodyBoundaryError(
    'PRIVILEGED_ENV_IN_NON_OWNER_RUNTIME',
    `Env var "${name}" is set in runtime "${runtime}", but its custody policy lists ` +
      `[${safety.allowedRuntimes.join(', ')}]. Remove it from this process's environment.`,
    { name, runtime, classification: safety }
  );
}
