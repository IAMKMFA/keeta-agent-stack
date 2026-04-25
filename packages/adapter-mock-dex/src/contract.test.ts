import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { MockDexAdapter } from './mock-dex.js';

const adapter = new MockDexAdapter({
  spreadBps: 10,
  feeBps: 5,
  maxSlippageBps: 25,
  failureRate: 0,
  seed: 'test-seed',
});

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'USDC',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('MockDexAdapter price feed', () => {
  it('uses the configured mid price for quote math', async () => {
    const priced = new MockDexAdapter({
      spreadBps: 0,
      feeBps: 0,
      maxSlippageBps: 0,
      failureRate: 0,
      priceFeed: ({ baseAsset, quoteAsset }) =>
        baseAsset === 'KTA' && quoteAsset === 'USDC' ? 2 : 1,
    });

    const quote = await priced.getQuote({
      adapterId: priced.id,
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'sell',
      size: '3',
    });

    expect(quote.success).toBe(true);
    if (quote.success) {
      expect(quote.data.price).toBe('2');
      expect(quote.data.sizeOut).toBe('6');
      expect(quote.data.raw).toMatchObject({ mock: true, midPrice: '2' });
    }
  });

  it('defaults the mid price to one when no price feed is configured', async () => {
    const defaulted = new MockDexAdapter({
      spreadBps: 0,
      feeBps: 0,
      maxSlippageBps: 0,
      failureRate: 0,
    });

    const quote = await defaulted.getQuote({
      adapterId: defaulted.id,
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'sell',
      size: '3',
    });

    expect(quote.success).toBe(true);
    if (quote.success) {
      expect(quote.data.price).toBe('1');
      expect(quote.data.sizeOut).toBe('3');
    }
  });
});
