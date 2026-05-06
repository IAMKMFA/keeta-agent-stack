/**
 * @keeta-agent-stack/custody-guards
 *
 * Runtime guards that enforce the secret-boundary contract documented in
 * `docs/security/SECRET_BOUNDARY_MAP.md` and `docs/security/CUSTODY_GUARD_AUDIT.md`.
 *
 * Public surface:
 *
 *   - `CustodyBoundaryError` and its `code` enum.
 *   - `RuntimeKind`, `detectRuntime`, `declareRuntime`, `KEETA_RUNTIME_ENV`.
 *   - `assertWorkerSigningRuntime` — wire at signing call sites.
 *   - `assertNoBrowserSecretExposure` — wire at API / dashboard / web boot.
 *   - `assertNoInlineSeedUnlessExplicitlyAllowed` — single source of truth for MCP.
 *   - `assertEnvNotPresentForRuntime` — opt-in hard fail for misconfigured envs.
 *   - `validateNextPublicEnvName` — lint helper.
 *   - `classifyEnvVarSafety`, `looksLikeSecretName`.
 *   - `redactSecret`, `redactObjectSecrets`, `isSecretLikeKey`.
 *
 * This package has zero runtime dependencies. It is safe to import from the
 * worker, the API, MCP, the dashboard server, the public web app, the SDK,
 * and from build/lint scripts.
 */

export {
  CustodyBoundaryError,
  type CustodyBoundaryErrorCode,
} from './errors.js';

export {
  type RuntimeKind,
  KEETA_RUNTIME_ENV,
  detectRuntime,
  declareRuntime,
} from './runtime.js';

export {
  assertWorkerSigningRuntime,
  assertNoBrowserSecretExposure,
  assertNoInlineSeedUnlessExplicitlyAllowed,
  assertEnvNotPresentForRuntime,
  isInlineSeedFlagEnabled,
  validateNextPublicEnvName,
} from './custody-boundary.js';

export {
  type EnvVarClass,
  type EnvVarSafety,
  classifyEnvVarSafety,
  looksLikeSecretName,
} from './env-classifier.js';

export {
  redactSecret,
  redactObjectSecrets,
  isSecretLikeKey,
} from './redact.js';
