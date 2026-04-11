import { describe, expect, it } from 'vitest';
import { ruleIdentityAttestation } from './identity-attestation.js';
import type { PolicyContext } from '../types.js';

const base: PolicyContext = {
  intent: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    baseAsset: 'KTA',
    quoteAsset: 'KTA',
    side: 'buy',
    size: '1',
    maxSlippageBps: 30,
    mode: 'live',
    createdAt: new Date().toISOString(),
  },
  config: {
    maxOrderSize: 1_000_000,
    maxSlippageBps: 500,
    venueAllowlist: [],
    assetAllowlist: [],
    liveModeEnabled: true,
  },
};

describe('ruleIdentityAttestation', () => {
  it('passes when identity policy disabled', () => {
    const r = ruleIdentityAttestation(base);
    expect(r.passed).toBe(true);
  });

  it('fails when identity policy enabled but no signals', () => {
    const r = ruleIdentityAttestation({
      ...base,
      config: { ...base.config, identityPolicyEnabled: true },
      identityHints: {
        hasAttestation: false,
      },
    });
    expect(r.passed).toBe(false);
  });

  it('passes when agentId present', () => {
    const r = ruleIdentityAttestation({
      ...base,
      config: { ...base.config, identityPolicyEnabled: true },
      identityHints: {
        hasAttestation: false,
        agentId: 'agent-1',
      },
    });
    expect(r.passed).toBe(true);
  });
});
