import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { PayShAdapter } from './pay-sh-adapter.js';

const adapter = new PayShAdapter();

runAdapterContractSuite(adapter, {
  supportedBase: 'X402_API_CREDIT',
  supportedQuote: 'GEMINI_API_CALL',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('PayShAdapter', () => {
  it('discovers Google Cloud-style API profiles', () => {
    expect(adapter.discoverApis()).toEqual(
      expect.arrayContaining([
        expect.objectContaining({
          id: 'gemini-generate-content',
          provider: 'Google Cloud',
        }),
      ])
    );
  });

  it('quotes a Gemini API request', async () => {
    const quote = await adapter.getQuote({
      adapterId: adapter.id,
      baseAsset: 'X402_API_CREDIT',
      quoteAsset: 'GEMINI_API_CALL',
      side: 'sell',
      size: '2',
    });

    expect(quote.success).toBe(true);
    if (quote.success) {
      expect(quote.data.raw?.agentPayment).toMatchObject({
        rail: 'pay-sh',
        apiId: 'gemini-generate-content',
        provider: 'Google Cloud',
        supportLevel: 'simulatable',
      });
    }
  });

  it('simulates an API receipt', async () => {
    const result = await adapter.execute({
      intentId: '550e8400-e29b-41d4-a716-446655440000',
      walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
      mode: 'simulate',
      step: {
        stepIndex: 0,
        adapterId: adapter.id,
        venueKind: 'agent-payment',
        baseAsset: 'X402_API_CREDIT',
        quoteAsset: 'GEMINI_API_CALL',
        side: 'sell',
        sizeIn: '1',
        sizeOutEstimate: '1',
        feeBps: 45,
      },
    });

    expect(result.success).toBe(true);
    if (result.success) {
      expect(result.data.normalizedReceipt).toMatchObject({
        railKind: 'agent_payment',
        adapterId: adapter.id,
      });
    }
  });
});
