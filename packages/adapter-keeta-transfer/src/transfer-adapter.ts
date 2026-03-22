import type { VenueAdapter } from '@keeta-agent-sdk/adapter-base';
import { err, ok } from '@keeta-agent-sdk/adapter-base';
import type { ExecuteContext } from '@keeta-agent-sdk/adapter-base';
import { buildTransferTx } from '@keeta-agent-sdk/keeta';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-sdk/types';
import { randomUUID } from 'node:crypto';

export class KeetaTransferAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'transfer' as const;

  constructor(id = 'keeta-transfer') {
    this.id = id;
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      checkedAt: new Date().toISOString(),
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'transfer',
      pairs: [{ base: 'KTA', quote: 'KTA' }],
      features: ['transfer'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return baseAsset === quoteAsset && baseAsset === 'KTA';
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', 'Keeta transfer only supports same-asset KTA transfers (stub)');
    }
    return ok({
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut: request.size,
      price: '1',
      feeBps: 0,
      expectedSlippageBps: 0,
      raw: { stub: true },
    });
  }

  async execute(context: ExecuteContext) {
    void context;
    // Stub: build empty bytes — real path would use signer outside this layer.
    await buildTransferTx({
      to: 'keeta_placeholder',
      assetId: 'KTA',
      amount: '0',
    });
    // TODO: wire real Keeta transfer + external signer via worker/API
    return ok({
      id: randomUUID(),
      intentId: context.intentId,
      adapterId: this.id,
      status: 'confirmed' as const,
      completedAt: new Date().toISOString(),
      raw: { stub: true },
    });
  }
}
