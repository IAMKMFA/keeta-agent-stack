/**
 * Implements the existing `VenueAdapter` contract from
 * `@keeta-agent-stack/adapter-base` for simulated Machine Payments Protocol flows.
 */
import type { ExecuteContext, VenueAdapter } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

const DEFAULT_PAIRS = [
  { base: 'KTA', quote: 'MPP_API_CREDIT' },
  { base: 'USDC', quote: 'MPP_API_CREDIT' },
];

export interface MppAdapterConfig {
  id?: string;
  supportedPairs?: Array<{ base: string; quote: string }>;
  baseRequestFeeUsd?: number;
  feeBps?: number;
}

function pairKey(base: string, quote: string): string {
  return `${base}:${quote}`;
}

function decimal(value: number, places = 6): string {
  return Number.isFinite(value) ? value.toFixed(places).replace(/\.?0+$/, '') : '0';
}

export class MppAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'agent-payment' as const;

  private readonly pairs: Set<string>;
  private readonly baseRequestFeeUsd: number;
  private readonly feeBps: number;

  constructor(config: MppAdapterConfig = {}) {
    this.id = config.id ?? 'mpp';
    this.pairs = new Set(
      (config.supportedPairs ?? DEFAULT_PAIRS).map((p) => pairKey(p.base, p.quote))
    );
    this.baseRequestFeeUsd = config.baseRequestFeeUsd ?? 0.035;
    this.feeBps = config.feeBps ?? 35;
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 20,
      checkedAt: new Date().toISOString(),
      message: 'Simulated MPP rail available',
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: this.kind,
      pairs: [...this.pairs].map((key) => {
        const [base, quote] = key.split(':');
        return { base: base!, quote: quote! };
      }),
      features: ['quote', 'simulate', 'agent-payment', 'mpp', 'subscriptions', 'streaming'],
      supportLevel: 'simulatable',
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return this.pairs.has(pairKey(baseAsset, quoteAsset));
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err(
        'UNSUPPORTED_PAIR',
        `MPP does not support ${request.baseAsset}/${request.quoteAsset}`
      );
    }

    const requestUnits = Math.max(1, Number(request.size) || 1);
    const estimatedUsd = this.baseRequestFeeUsd * requestUnits;
    const protocolFeeUsd = estimatedUsd * (this.feeBps / 10_000);
    const totalUsd = estimatedUsd + protocolFeeUsd;

    return ok({
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut: decimal(requestUnits),
      price: decimal(totalUsd / requestUnits, 8),
      feeBps: this.feeBps,
      expectedSlippageBps: 0,
      validUntil: new Date(Date.now() + 180_000).toISOString(),
      raw: {
        agentPayment: {
          rail: 'mpp',
          protocol: 'Machine Payments Protocol',
          estimatedUsd: decimal(totalUsd, 8),
          settlementAsset: 'USDC',
          lifecycle: 'one-shot',
          supportLevel: 'simulatable',
        },
      },
    });
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      const railRef = `mpp_sim_${randomUUID().slice(0, 8)}`;
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        settlementState: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '1',
        avgPrice: context.step?.quote?.price ?? '0.035',
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'agent_payment' as const,
          network: 'mpp',
          settlementState: 'confirmed' as const,
          adapterId: this.id,
          railRef,
        },
        raw: {
          agentPayment: {
            rail: 'mpp',
            mode: 'simulate',
            railRef,
            lifecycle: 'one-shot',
          },
        },
      });
    }

    return err(
      'MPP_LIVE_NOT_CONFIGURED',
      'MPP live execution is not configured in this alpha; use mode="simulate".'
    );
  }
}
