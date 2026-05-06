import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { X402Adapter } from './x402-adapter.js';

const adapter = new X402Adapter({ baseRequestFeeUsd: 0.02 });

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'X402_API_CREDIT',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('X402Adapter', () => {
  it('quotes stablecoin-denominated request fees', async () => {
    const quote = await adapter.getQuote({
      adapterId: adapter.id,
      baseAsset: 'KTA',
      quoteAsset: 'X402_API_CREDIT',
      side: 'sell',
      size: '3',
    });

    expect(quote.success).toBe(true);
    if (quote.success) {
      expect(quote.data.raw?.agentPayment).toMatchObject({
        rail: 'x402',
        protocol: 'HTTP 402',
        settlementAsset: 'USDC',
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
      code: 'X402_LIVE_NOT_CONFIGURED',
    });
  });
});
