import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { MppAdapter } from './mpp-adapter.js';

const adapter = new MppAdapter();

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'MPP_API_CREDIT',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('MppAdapter', () => {
  it('quotes a simulated machine payment', async () => {
    const quote = await adapter.getQuote({
      adapterId: adapter.id,
      baseAsset: 'KTA',
      quoteAsset: 'MPP_API_CREDIT',
      side: 'sell',
      size: '2',
    });

    expect(quote.success).toBe(true);
    if (quote.success) {
      expect(quote.data.raw?.agentPayment).toMatchObject({
        rail: 'mpp',
        protocol: 'Machine Payments Protocol',
        supportLevel: 'simulatable',
      });
    }
  });

  it('returns a structured live-mode failure', async () => {
    const result = await adapter.execute({
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mode: 'live',
    });

    expect(result).toMatchObject({
      success: false,
      code: 'MPP_LIVE_NOT_CONFIGURED',
    });
  });
});
