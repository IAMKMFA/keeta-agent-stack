import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { inlineSeedsAllowed, resolveSeedOrThrow } from './execute.js';

describe('MCP execute seed handling', () => {
  const originalInline = process.env.MCP_ALLOW_INLINE_SEEDS;
  const originalSigning = process.env.KEETA_SIGNING_SEED;

  beforeEach(() => {
    delete process.env.MCP_ALLOW_INLINE_SEEDS;
    delete process.env.KEETA_SIGNING_SEED;
  });

  afterEach(() => {
    if (originalInline === undefined) delete process.env.MCP_ALLOW_INLINE_SEEDS;
    else process.env.MCP_ALLOW_INLINE_SEEDS = originalInline;
    if (originalSigning === undefined) delete process.env.KEETA_SIGNING_SEED;
    else process.env.KEETA_SIGNING_SEED = originalSigning;
  });

  describe('inlineSeedsAllowed', () => {
    it('returns true only for explicit opt-in values', () => {
      expect(inlineSeedsAllowed()).toBe(false);
      process.env.MCP_ALLOW_INLINE_SEEDS = 'true';
      expect(inlineSeedsAllowed()).toBe(true);
      process.env.MCP_ALLOW_INLINE_SEEDS = '1';
      expect(inlineSeedsAllowed()).toBe(true);
      process.env.MCP_ALLOW_INLINE_SEEDS = 'yes';
      expect(inlineSeedsAllowed()).toBe(false);
    });
  });

  describe('resolveSeedOrThrow', () => {
    it('throws when an inline seed is passed but the flag is not set', () => {
      expect(() => resolveSeedOrThrow('leaked-seed')).toThrow(/Inline seeds are disabled/);
    });

    it('returns the inline seed when the flag is set', () => {
      process.env.MCP_ALLOW_INLINE_SEEDS = 'true';
      expect(resolveSeedOrThrow('inline-seed')).toBe('inline-seed');
    });

    it('falls back to the worker-held KEETA_SIGNING_SEED when no inline seed is given', () => {
      process.env.KEETA_SIGNING_SEED = 'worker-seed';
      expect(resolveSeedOrThrow(undefined)).toBe('worker-seed');
    });

    it('returns undefined when no inline seed is given and no KEETA_SIGNING_SEED is set', () => {
      expect(resolveSeedOrThrow(undefined)).toBeUndefined();
    });

    it('prefers inline seed over the env seed when the flag is set', () => {
      process.env.MCP_ALLOW_INLINE_SEEDS = 'true';
      process.env.KEETA_SIGNING_SEED = 'worker-seed';
      expect(resolveSeedOrThrow('inline-seed')).toBe('inline-seed');
    });
  });
});
