/**
 * Implements the existing `VenueAdapter` contract from
 * `@keeta-agent-stack/adapter-base` for simulated pay.sh API payment discovery.
 */
import type { ExecuteContext, VenueAdapter } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

export interface PayShApiProfile {
  id: string;
  name: string;
  outputAsset: string;
  unitPriceUsd: number;
  provider: string;
}

export interface PayShAdapterConfig {
  id?: string;
  apiProfiles?: PayShApiProfile[];
  feeBps?: number;
}

const DEFAULT_APIS: PayShApiProfile[] = [
  {
    id: 'gemini-generate-content',
    name: 'Gemini API call',
    outputAsset: 'GEMINI_API_CALL',
    unitPriceUsd: 0.045,
    provider: 'Google Cloud',
  },
  {
    id: 'bigquery-query',
    name: 'BigQuery query',
    outputAsset: 'BIGQUERY_API_CALL',
    unitPriceUsd: 0.065,
    provider: 'Google Cloud',
  },
  {
    id: 'vertex-ai-predict',
    name: 'Vertex AI prediction',
    outputAsset: 'VERTEX_AI_CALL',
    unitPriceUsd: 0.055,
    provider: 'Google Cloud',
  },
];

function decimal(value: number, places = 6): string {
  return Number.isFinite(value) ? value.toFixed(places).replace(/\.?0+$/, '') : '0';
}

export class PayShAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind = 'agent-payment' as const;

  private readonly apiProfiles: PayShApiProfile[];
  private readonly feeBps: number;

  constructor(config: PayShAdapterConfig = {}) {
    this.id = config.id ?? 'pay-sh';
    this.apiProfiles = config.apiProfiles ?? DEFAULT_APIS;
    this.feeBps = config.feeBps ?? 45;
  }

  discoverApis(): PayShApiProfile[] {
    return this.apiProfiles.map((api) => ({ ...api }));
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 24,
      checkedAt: new Date().toISOString(),
      message: 'Simulated pay.sh API catalog available',
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: this.kind,
      pairs: this.apiProfiles.map((api) => ({
        base: 'X402_API_CREDIT',
        quote: api.outputAsset,
      })),
      features: ['quote', 'simulate', 'agent-payment', 'pay-sh', 'api-discovery', 'x402', 'mpp'],
      supportLevel: 'simulatable',
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return (
      baseAsset === 'X402_API_CREDIT' &&
      this.apiProfiles.some((api) => api.outputAsset === quoteAsset)
    );
  }

  private apiForOutput(outputAsset: string): PayShApiProfile | undefined {
    return this.apiProfiles.find((api) => api.outputAsset === outputAsset);
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err(
        'UNSUPPORTED_PAIR',
        `pay.sh does not support ${request.baseAsset}/${request.quoteAsset}`
      );
    }

    const api = this.apiForOutput(request.quoteAsset)!;
    const requestUnits = Math.max(1, Number(request.size) || 1);
    const subtotalUsd = api.unitPriceUsd * requestUnits;
    const feeUsd = subtotalUsd * (this.feeBps / 10_000);
    const totalUsd = subtotalUsd + feeUsd;

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
      validUntil: new Date(Date.now() + 90_000).toISOString(),
      raw: {
        agentPayment: {
          rail: 'pay-sh',
          apiId: api.id,
          apiName: api.name,
          provider: api.provider,
          estimatedUsd: decimal(totalUsd, 8),
          requestUnits,
          supportLevel: 'simulatable',
        },
      },
    });
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      const apiAsset = context.step?.quoteAsset ?? 'GEMINI_API_CALL';
      const api = this.apiForOutput(apiAsset);
      const railRef = `pay_sh_sim_${randomUUID().slice(0, 8)}`;

      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        settlementState: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '1',
        avgPrice: context.step?.quote?.price ?? decimal(api?.unitPriceUsd ?? 0.045),
        completedAt: new Date().toISOString(),
        normalizedReceipt: {
          railKind: 'agent_payment' as const,
          network: 'solana',
          settlementState: 'confirmed' as const,
          adapterId: this.id,
          railRef,
        },
        raw: {
          agentPayment: {
            rail: 'pay-sh',
            mode: 'simulate',
            railRef,
            apiId: api?.id ?? 'gemini-generate-content',
            response: {
              status: 200,
              body: 'Simulated Gemini response delivered after pay.sh settlement.',
            },
          },
        },
      });
    }

    return err(
      'PAY_SH_LIVE_NOT_CONFIGURED',
      'pay.sh live execution is not configured in this alpha; use mode="simulate".'
    );
  }
}
