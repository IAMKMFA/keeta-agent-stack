import { describe, expect, it } from 'vitest';
import { createAnchorBondVerifier } from './anchor-bonds.js';

describe('createAnchorBondVerifier', () => {
  it('trusts active database bond state when strict mode is off', async () => {
    const verifier = createAnchorBondVerifier({ ANCHOR_BOND_STRICT: false });
    const result = await verifier.verifyBond({
      paymentAnchorId: '550e8400-e29b-41d4-a716-446655440000',
      adapterId: 'mock-anchor',
      status: 'active',
      delayDays: 90,
    });
    expect(result.verified).toBe(true);
    expect(result.source).toBe('database');
  });

  it('requires a lock reference when strict mode is on', async () => {
    const verifier = createAnchorBondVerifier({ ANCHOR_BOND_STRICT: true });
    const result = await verifier.verifyBond({
      paymentAnchorId: '550e8400-e29b-41d4-a716-446655440000',
      adapterId: 'mock-anchor',
      status: 'active',
      delayDays: 90,
    });
    expect(result.verified).toBe(false);
    expect(result.source).toBe('strict-missing');
  });

  it('normalizes active bonds without lock refs into failed verification during inspection', async () => {
    const verifier = createAnchorBondVerifier({ ANCHOR_BOND_STRICT: true });
    const result = await verifier.inspectBond({
      paymentAnchorId: '550e8400-e29b-41d4-a716-446655440000',
      adapterId: 'mock-anchor',
      status: 'active',
      delayDays: 90,
    });
    expect(result.observedStatus).toBe('failed_verification');
    expect(result.verified).toBe(false);
    expect(result.source).toBe('strict-missing');
  });
});
