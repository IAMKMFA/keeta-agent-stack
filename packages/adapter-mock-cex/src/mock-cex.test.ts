import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { MockCexAdapter } from './mock-cex.js';

const adapter = new MockCexAdapter({
  feeBps: 10,
  latencyMs: 0,
  latencyJitterMs: 0,
  books: { 'KTA/USDC': { mid: '1.0', spreadBps: 8 } },
});

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'USDC',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('MockCexAdapter behaviour', () => {
  it('respects KEETA_ENABLE_MOCK_CEX env flag', () => {
    expect(MockCexAdapter.isEnabled({})).toBe(false);
    expect(MockCexAdapter.isEnabled({ KEETA_ENABLE_MOCK_CEX: 'true' })).toBe(true);
    expect(MockCexAdapter.isEnabled({ KEETA_ENABLE_MOCK_CEX: '1' })).toBe(true);
  });

  it('updates internal balances on live execute and records fills', async () => {
    const cex = new MockCexAdapter({
      feeBps: 0,
      latencyMs: 0,
      latencyJitterMs: 0,
      books: { 'KTA/USDC': { mid: '1', spreadBps: 0 } },
      balances: { USDC: 100, KTA: 100 },
    });
    const before = { usdc: cex.getBalance('USDC'), kta: cex.getBalance('KTA') };
    const res = await cex.execute({
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mode: 'live',
      step: {
        stepIndex: 0,
        adapterId: cex.id,
        baseAsset: 'KTA',
        quoteAsset: 'USDC',
        side: 'buy',
        sizeIn: '10',
        sizeOutEstimate: '10',
        feeBps: 0,
      },
    });
    expect(res.success).toBe(true);
    expect(cex.getBalance('USDC')).toBeCloseTo(before.usdc - 10, 6);
    expect(cex.getBalance('KTA')).toBeCloseTo(before.kta + 10, 6);
    expect(cex.getFills()).toHaveLength(1);
  });
});
