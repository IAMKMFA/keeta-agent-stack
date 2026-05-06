/**
 * Implements the existing `VenueAdapter` contract from
 * `@keeta-agent-stack/adapter-base` for simulated x402 HTTP 402 agent payments.
 */
import type { ExecuteContext, VenueAdapter } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

const DEFAULT_PAIRS = [
  { base: 'KTA', quote: 'X402_API_CREDIT' },
  { base: 'USDC', quote: 'X402_API_CREDIT' },
];

export interface X402AdapterConfig {
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

export class X402Adapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'agent-payment' as const;

  private readonly pairs: Set<string>;
  private readonly baseRequestFeeUsd: number;
  private readonly feeBps: number;

  constructor(config: X402AdapterConfig = {}) {
    this.id = config.id ?? 'x402';
    this.pairs = new Set(
      (config.supportedPairs ?? DEFAULT_PAIRS).map((p) => pairKey(p.base, p.quote))
    );
    this.baseRequestFeeUsd = config.baseRequestFeeUsd ?? 0.025;
    this.feeBps = config.feeBps ?? 30;
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 18,
      checkedAt: new Date().toISOString(),
      message: 'Simulated x402 facilitator available',
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
      features: ['quote', 'simulate', 'agent-payment', 'x402', 'http-402', 'stablecoin'],
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
        `x402 does not support ${request.baseAsset}/${request.quoteAsset}`
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
      validUntil: new Date(Date.now() + 120_000).toISOString(),
      raw: {
        agentPayment: {
          rail: 'x402',
          protocol: 'HTTP 402',
          estimatedUsd: decimal(totalUsd, 8),
          estimatedStablecoin: decimal(totalUsd, 8),
          settlementAsset: 'USDC',
          supportLevel: 'simulatable',
        },
      },
    });
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      const railRef = `x402_sim_${randomUUID().slice(0, 8)}`;
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        settlementState: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '1',
        avgPrice: context.step?.quote?.price ?? '0.025',
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'agent_payment' as const,
          network: 'x402',
          settlementState: 'confirmed' as const,
          adapterId: this.id,
          railRef,
        },
        raw: {
          agentPayment: {
            rail: 'x402',
            mode: 'simulate',
            railRef,
            endpoint: context.intentMetadata?.apiEndpoint ?? 'https://api.example.com/x402',
          },
        },
      });
    }

    return err(
      'X402_LIVE_NOT_CONFIGURED',
      'x402 live execution is not configured in this alpha; use mode="simulate".'
    );
  }
}
