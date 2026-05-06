import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  CustodyBoundaryError,
  KEETA_RUNTIME_ENV,
  assertEnvNotPresentForRuntime,
  assertNoBrowserSecretExposure,
  assertNoInlineSeedUnlessExplicitlyAllowed,
  assertWorkerSigningRuntime,
  classifyEnvVarSafety,
  declareRuntime,
  detectRuntime,
  isInlineSeedFlagEnabled,
  isSecretLikeKey,
  looksLikeSecretName,
  redactObjectSecrets,
  redactSecret,
  validateNextPublicEnvName,
} from './index.js';

function withEnv(overrides: NodeJS.ProcessEnv): NodeJS.ProcessEnv {
  // Use a fresh object rather than mutating process.env so tests don't leak.
  return { ...overrides };
}

describe('runtime detection', () => {
  it('honors explicit KEETA_RUNTIME', () => {
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'worker' }))).toBe('worker');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'api' }))).toBe('api');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'mcp' }))).toBe('mcp');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'dashboard' }))).toBe('dashboard');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'web' }))).toBe('web');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'sdk' }))).toBe('sdk');
    expect(detectRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'test' }))).toBe('test');
  });

  it('detects vitest/jest as test', () => {
    expect(detectRuntime(withEnv({ VITEST: 'true' }))).toBe('test');
    expect(detectRuntime(withEnv({ JEST_WORKER_ID: '1' }))).toBe('test');
    expect(detectRuntime(withEnv({ NODE_ENV: 'test' }))).toBe('test');
  });

  it('returns "unknown" when nothing is set (fail-closed)', () => {
    expect(detectRuntime(withEnv({}))).toBe('unknown');
  });

  it('declareRuntime is idempotent', () => {
    const env = withEnv({});
    expect(declareRuntime('worker', env)).toBe('worker');
    expect(env[KEETA_RUNTIME_ENV]).toBe('worker');
    // Second call ignores the new arg if a valid runtime is already set.
    expect(declareRuntime('api', env)).toBe('worker');
    expect(env[KEETA_RUNTIME_ENV]).toBe('worker');
  });
});

describe('assertWorkerSigningRuntime', () => {
  it('allows worker', () => {
    expect(assertWorkerSigningRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'worker' }))).toBe('worker');
  });

  it('allows test', () => {
    expect(assertWorkerSigningRuntime(withEnv({ [KEETA_RUNTIME_ENV]: 'test' }))).toBe('test');
  });

  it('rejects api/mcp/dashboard/web/sdk/unknown', () => {
    for (const runtime of ['api', 'mcp', 'dashboard', 'web', 'sdk', 'unknown'] as const) {
      let thrown: unknown;
      try {
        assertWorkerSigningRuntime(withEnv({ [KEETA_RUNTIME_ENV]: runtime }));
      } catch (err) {
        thrown = err;
      }
      expect(thrown).toBeInstanceOf(CustodyBoundaryError);
      expect((thrown as CustodyBoundaryError).code).toBe('WRONG_RUNTIME_FOR_SIGNING');
    }
  });

  it('rejects when KEETA_RUNTIME is missing', () => {
    expect(() => assertWorkerSigningRuntime(withEnv({}))).toThrow(CustodyBoundaryError);
  });
});

describe('assertNoBrowserSecretExposure', () => {
  it('passes when only safe NEXT_PUBLIC_* vars are present', () => {
    const result = assertNoBrowserSecretExposure(
      withEnv({
        NEXT_PUBLIC_API_URL: 'http://localhost:3001',
        NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE: 'https://x/{hash}',
      })
    );
    expect(result.inspected).toBeGreaterThan(0);
  });

  it('rejects NEXT_PUBLIC_OPS_API_KEY', () => {
    let thrown: unknown;
    try {
      assertNoBrowserSecretExposure(withEnv({ NEXT_PUBLIC_OPS_API_KEY: 'k' }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CustodyBoundaryError);
    expect((thrown as CustodyBoundaryError).code).toBe('BROWSER_SECRET_EXPOSED');
  });

  it.each([
    'NEXT_PUBLIC_KEETA_SIGNING_SEED',
    'NEXT_PUBLIC_AUTH_JWT_SECRET',
    'NEXT_PUBLIC_ADMIN_BYPASS_TOKEN',
    'NEXT_PUBLIC_DASHBOARD_SECRET',
    'NEXT_PUBLIC_WEBHOOK_SECRET',
    'NEXT_PUBLIC_API_TOKEN',
    'NEXT_PUBLIC_PRIVATE_KEY',
    'NEXT_PUBLIC_KEETA_KMS_KEY',
  ])('rejects %s', (name) => {
    expect(() => assertNoBrowserSecretExposure(withEnv({ [name]: 'x' }))).toThrow(
      CustodyBoundaryError
    );
  });

  it('ignores non-NEXT_PUBLIC_ secret vars', () => {
    expect(() =>
      assertNoBrowserSecretExposure(
        withEnv({
          KEETA_SIGNING_SEED: 'still-a-secret-but-server-side',
          OPS_API_KEY: 'also-server-side',
        })
      )
    ).not.toThrow();
  });
});

describe('assertNoInlineSeedUnlessExplicitlyAllowed', () => {
  it('returns undefined when no seed is configured', () => {
    expect(assertNoInlineSeedUnlessExplicitlyAllowed(undefined, withEnv({}))).toBeUndefined();
  });

  it('falls back to KEETA_SIGNING_SEED when no inline seed is given', () => {
    expect(
      assertNoInlineSeedUnlessExplicitlyAllowed(
        undefined,
        withEnv({ KEETA_SIGNING_SEED: 'worker-seed' })
      )
    ).toBe('worker-seed');
  });

  it('rejects an inline seed when MCP_ALLOW_INLINE_SEEDS is unset', () => {
    let thrown: unknown;
    try {
      assertNoInlineSeedUnlessExplicitlyAllowed('inline', withEnv({}));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CustodyBoundaryError);
    expect((thrown as CustodyBoundaryError).code).toBe('INLINE_SEED_DISALLOWED');
  });

  it('honors MCP_ALLOW_INLINE_SEEDS=true', () => {
    expect(
      assertNoInlineSeedUnlessExplicitlyAllowed(
        'inline',
        withEnv({ MCP_ALLOW_INLINE_SEEDS: 'true' })
      )
    ).toBe('inline');
  });

  it('honors MCP_ALLOW_INLINE_SEEDS=1', () => {
    expect(
      assertNoInlineSeedUnlessExplicitlyAllowed('inline', withEnv({ MCP_ALLOW_INLINE_SEEDS: '1' }))
    ).toBe('inline');
  });

  it('rejects MCP_ALLOW_INLINE_SEEDS=yes/on/anything-else', () => {
    for (const v of ['yes', 'on', 'TRUE', '2', 'true ', '']) {
      expect(isInlineSeedFlagEnabled(withEnv({ MCP_ALLOW_INLINE_SEEDS: v }))).toBe(false);
    }
  });

  it('prefers the inline seed over KEETA_SIGNING_SEED when the flag is set', () => {
    expect(
      assertNoInlineSeedUnlessExplicitlyAllowed(
        'inline',
        withEnv({ MCP_ALLOW_INLINE_SEEDS: 'true', KEETA_SIGNING_SEED: 'worker' })
      )
    ).toBe('inline');
  });
});

describe('classifyEnvVarSafety', () => {
  it('classifies signing material as worker/test only', () => {
    const cls = classifyEnvVarSafety('KEETA_SIGNING_SEED');
    expect(cls.class).toBe('signing');
    expect(cls.browserSafe).toBe(false);
    expect(cls.allowedRuntimes).toEqual(['worker', 'test']);
  });

  it('classifies admin credentials as server-only', () => {
    const cls = classifyEnvVarSafety('OPS_API_KEY');
    expect(cls.class).toBe('admin-credential');
    expect(cls.browserSafe).toBe(false);
    expect(cls.allowedRuntimes).toContain('api');
    expect(cls.allowedRuntimes).toContain('dashboard');
  });

  it('classifies NEXT_PUBLIC_API_URL as public-config', () => {
    const cls = classifyEnvVarSafety('NEXT_PUBLIC_API_URL');
    expect(cls.class).toBe('public-config');
    expect(cls.browserSafe).toBe(true);
  });

  it('defaults unknown names to fail-closed', () => {
    const cls = classifyEnvVarSafety('SOME_RANDOM_VAR');
    expect(cls.class).toBe('unknown');
    expect(cls.browserSafe).toBe(false);
  });

  it('looksLikeSecretName matches the documented pattern', () => {
    expect(looksLikeSecretName('NEXT_PUBLIC_API_URL')).toBe(false);
    expect(looksLikeSecretName('NEXT_PUBLIC_OPS_API_KEY')).toBe(true);
    expect(looksLikeSecretName('NEXT_PUBLIC_SECRET_TOKEN')).toBe(true);
    expect(looksLikeSecretName('NEXT_PUBLIC_USER_CREDENTIAL')).toBe(true);
    expect(looksLikeSecretName('NEXT_PUBLIC_PRIVATE_KEY')).toBe(true);
  });
});

describe('validateNextPublicEnvName', () => {
  it('accepts safe NEXT_PUBLIC_API_URL', () => {
    const r = validateNextPublicEnvName('NEXT_PUBLIC_API_URL');
    expect(r.ok).toBe(true);
  });

  it('rejects NEXT_PUBLIC_OPS_API_KEY by name pattern', () => {
    const r = validateNextPublicEnvName('NEXT_PUBLIC_OPS_API_KEY');
    expect(r.ok).toBe(false);
  });

  it('rejects calls with a non-NEXT_PUBLIC_ name', () => {
    const r = validateNextPublicEnvName('OPS_API_KEY');
    expect(r.ok).toBe(false);
  });
});

describe('redaction', () => {
  it('redactSecret always returns [REDACTED]', () => {
    expect(redactSecret('seed-value')).toBe('[REDACTED]');
    expect(redactSecret('')).toBe('[REDACTED]');
    expect(redactSecret(undefined)).toBe('[REDACTED]');
    expect(redactSecret(null)).toBe('[REDACTED]');
  });

  it('isSecretLikeKey covers the documented surface', () => {
    expect(isSecretLikeKey('seed')).toBe(true);
    expect(isSecretLikeKey('signing_seed')).toBe(true);
    expect(isSecretLikeKey('SigningSeed')).toBe(true);
    expect(isSecretLikeKey('keetaSigningSeed')).toBe(true);
    expect(isSecretLikeKey('OPS_API_KEY')).toBe(true);
    expect(isSecretLikeKey('webhookSecret')).toBe(true);
    expect(isSecretLikeKey('apiKey')).toBe(true);
    expect(isSecretLikeKey('Authorization')).toBe(true);
    expect(isSecretLikeKey('userId')).toBe(false);
    expect(isSecretLikeKey('amount')).toBe(false);
  });

  it('redactObjectSecrets walks nested structures', () => {
    const input = {
      walletId: 'abc',
      seed: 'leaked',
      nested: {
        signingSeed: 'leaked',
        ops_api_key: 'leaked',
        amount: '42',
      },
      list: [{ apiKey: 'leaked', label: 'x' }],
    };
    const out = redactObjectSecrets(input);
    expect(out.walletId).toBe('abc');
    expect(out.seed).toBe('[REDACTED]');
    expect(out.nested.signingSeed).toBe('[REDACTED]');
    expect(out.nested.ops_api_key).toBe('[REDACTED]');
    expect(out.nested.amount).toBe('42');
    expect(out.list[0]?.apiKey).toBe('[REDACTED]');
    expect(out.list[0]?.label).toBe('x');
  });

  it('redactObjectSecrets returns primitives untouched', () => {
    expect(redactObjectSecrets(null)).toBeNull();
    expect(redactObjectSecrets(42)).toBe(42);
    expect(redactObjectSecrets('hello')).toBe('hello');
  });
});

describe('assertEnvNotPresentForRuntime', () => {
  it('passes when the env var is absent', () => {
    expect(() => assertEnvNotPresentForRuntime('api', 'KEETA_SIGNING_SEED', withEnv({}))).not.toThrow();
  });

  it('passes when the runtime is allowed for that var', () => {
    expect(() =>
      assertEnvNotPresentForRuntime(
        'worker',
        'KEETA_SIGNING_SEED',
        withEnv({ KEETA_SIGNING_SEED: 'x' })
      )
    ).not.toThrow();
  });

  it('passes when the var classifies as public/internal config', () => {
    expect(() =>
      assertEnvNotPresentForRuntime('api', 'NEXT_PUBLIC_API_URL', withEnv({ NEXT_PUBLIC_API_URL: 'x' }))
    ).not.toThrow();
  });

  it('throws when API runtime holds KEETA_SIGNING_SEED', () => {
    let thrown: unknown;
    try {
      assertEnvNotPresentForRuntime('api', 'KEETA_SIGNING_SEED', withEnv({ KEETA_SIGNING_SEED: 'x' }));
    } catch (err) {
      thrown = err;
    }
    expect(thrown).toBeInstanceOf(CustodyBoundaryError);
    expect((thrown as CustodyBoundaryError).code).toBe('PRIVILEGED_ENV_IN_NON_OWNER_RUNTIME');
  });

  it('passes when runtime is unknown (avoid false positives in ad-hoc scripts)', () => {
    expect(() =>
      assertEnvNotPresentForRuntime(
        'unknown',
        'KEETA_SIGNING_SEED',
        withEnv({ KEETA_SIGNING_SEED: 'x' })
      )
    ).not.toThrow();
  });
});

describe('error type', () => {
  it('exposes name and code for branching', () => {
    const err = new CustodyBoundaryError('WRONG_RUNTIME_FOR_SIGNING', 'msg', { foo: 1 });
    expect(err.name).toBe('CustodyBoundaryError');
    expect(err.code).toBe('WRONG_RUNTIME_FOR_SIGNING');
    expect(err.detail).toEqual({ foo: 1 });
    expect(err).toBeInstanceOf(Error);
  });
});

// Ensure the test runtime itself is detected so the worker-signing assertions
// above behave as documented when test files import them.
beforeEach(() => {
  delete process.env[KEETA_RUNTIME_ENV];
});
afterEach(() => {
  delete process.env[KEETA_RUNTIME_ENV];
});
