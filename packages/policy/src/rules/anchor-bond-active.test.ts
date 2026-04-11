import { describe, expect, it } from 'vitest';
import { ruleAnchorBondActive } from './anchor-bond-active.js';
import type { PolicyContext } from '../types.js';

const baseContext: PolicyContext = {
  intent: {
    id: '550e8400-e29b-41d4-a716-446655440000',
    walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
    baseAsset: 'USD',
    quoteAsset: 'AED',
    side: 'sell',
    size: '1000',
    maxSlippageBps: 50,
    mode: 'live',
    createdAt: new Date().toISOString(),
  },
  config: {
    maxOrderSize: 1_000_000,
    maxSlippageBps: 500,
    venueAllowlist: [],
    assetAllowlist: [],
    liveModeEnabled: true,
    anchorBondVerificationRequired: true,
  },
  routePlan: {
    id: '550e8400-e29b-41d4-a716-446655440001',
    intentId: '550e8400-e29b-41d4-a716-446655440000',
    steps: [
      {
        stepIndex: 0,
        adapterId: 'mock-anchor',
        venueKind: 'anchor',
        paymentAnchorId: '550e8400-e29b-41d4-a716-446655440002',
        baseAsset: 'USD',
        quoteAsset: 'AED',
        side: 'sell',
        sizeIn: '1000',
        sizeOutEstimate: '995',
        feeBps: 18,
      },
    ],
    totalFeeBps: 18,
    expectedSlippageBps: 0,
    hopCount: 1,
    score: 1,
    createdAt: new Date().toISOString(),
  },
};

describe('ruleAnchorBondActive', () => {
  it('passes when live anchor route has verified active bond', () => {
    const result = ruleAnchorBondActive({
      ...baseContext,
      anchorBonds: {
        'mock-anchor': {
          paymentAnchorId: '550e8400-e29b-41d4-a716-446655440002',
          adapterId: 'mock-anchor',
          anchorStatus: 'active',
          bondStatus: 'active',
          amountAtomic: '1000',
          assetId: 'KTA',
          delayDays: 90,
          verified: true,
          verificationSource: 'database',
        },
      },
    });
    expect(result.passed).toBe(true);
  });

  it('fails when verification is required and missing', () => {
    const result = ruleAnchorBondActive({
      ...baseContext,
      anchorBonds: {
        'mock-anchor': {
          paymentAnchorId: '550e8400-e29b-41d4-a716-446655440002',
          adapterId: 'mock-anchor',
          anchorStatus: 'active',
          bondStatus: 'active',
          verified: false,
          verificationSource: 'strict-missing',
        },
      },
    });
    expect(result.passed).toBe(false);
    expect(result.reason).toContain('not verified');
  });
});
