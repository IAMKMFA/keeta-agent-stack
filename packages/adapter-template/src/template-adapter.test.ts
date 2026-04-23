import { describe, expect, it } from 'vitest';
import { AdapterHealthSchema, CapabilityMapSchema } from '@keeta-agent-sdk/types';
import { NotImplementedError, TemplateAdapter } from './template-adapter.js';

describe('TemplateAdapter', () => {
  const adapter = new TemplateAdapter();

  it('reports healthy and exposes a capability map', async () => {
    const health = await adapter.healthCheck();
    expect(() => AdapterHealthSchema.parse(health)).not.toThrow();

    const caps = await adapter.getCapabilities();
    expect(() => CapabilityMapSchema.parse(caps)).not.toThrow();
    expect(caps.kind).toBe('dex');
  });

  it('rejects unsupported pairs with structured UNSUPPORTED_PAIR', async () => {
    expect(adapter.supportsPair('NOPE', 'PAIR')).toBe(false);
    const res = await adapter.getQuote({
      adapterId: adapter.id,
      baseAsset: 'NOPE',
      quoteAsset: 'PAIR',
      side: 'buy',
      size: '1',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('UNSUPPORTED_PAIR');
    }
  });

  it('returns NOT_IMPLEMENTED for supported quotes until you wire the venue', async () => {
    const res = await adapter.getQuote({
      adapterId: adapter.id,
      baseAsset: 'KTA',
      quoteAsset: 'USDC',
      side: 'buy',
      size: '1',
    });
    expect(res.success).toBe(false);
    if (!res.success) {
      expect(res.code).toBe('NOT_IMPLEMENTED');
    }
  });

  it('throws NotImplementedError on execute', async () => {
    await expect(
      adapter.execute({
        intentId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        mode: 'simulate',
      })
    ).rejects.toBeInstanceOf(NotImplementedError);
  });
});
