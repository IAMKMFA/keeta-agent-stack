import type { DexVenueAdapter } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type { ExecuteContext } from '@keeta-agent-stack/adapter-base';
import type {
  AdapterHealth,
  CapabilityMap,
  QuoteRequest,
  QuoteResponse,
} from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

export interface MockDexPriceFeedInput {
  baseAsset: string;
  quoteAsset: string;
}

export type MockDexPriceFeed = (input: MockDexPriceFeedInput) => number | string | Promise<number | string>;

export interface MockDexConfig {
  id?: string;
  spreadBps: number;
  feeBps: number;
  maxSlippageBps: number;
  failureRate: number;
  seed?: string;
  /** Defaults to KTA/USDC */
  supportedPairs?: Array<{ base: string; quote: string }>;
  /** Optional deterministic mid-price feed. Defaults every pair to 1. */
  priceFeed?: MockDexPriceFeed;
}

function createRng(seed?: string): () => number {
  let s = 123456789;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      s = (Math.imul(31, s) + seed.charCodeAt(i)) | 0;
    }
  } else {
    s = (Math.random() * 0x7fffffff) | 0;
  }
  return () => {
    s = (s * 1664525 + 1013904223) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function keyPair(base: string, quote: string): string {
  return `${base}:${quote}`;
}

export class MockDexAdapter implements DexVenueAdapter {
  readonly id: string;
  readonly kind = 'dex' as const;
  private readonly spreadBps: number;
  private readonly feeBps: number;
  private readonly maxSlippageBps: number;
  private readonly failureRate: number;
  private readonly rng: () => number;
  private readonly pairs: Set<string>;
  private readonly priceFeed?: MockDexPriceFeed;

  constructor(cfg: MockDexConfig) {
    this.id = cfg.id ?? 'mock-dex';
    this.spreadBps = cfg.spreadBps;
    this.feeBps = cfg.feeBps;
    this.maxSlippageBps = cfg.maxSlippageBps;
    this.failureRate = cfg.failureRate;
    this.rng = createRng(cfg.seed);
    this.priceFeed = cfg.priceFeed;
    this.pairs = new Set(
      (cfg.supportedPairs ?? [{ base: 'KTA', quote: 'USDC' }]).map((p) => keyPair(p.base, p.quote))
    );
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 1 + Math.floor(this.rng() * 5),
      checkedAt: new Date().toISOString(),
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'dex',
      pairs: [...this.pairs].map((k) => {
        const [base, quote] = k.split(':');
        return { base: base!, quote: quote! };
      }),
      features: ['swap', 'quote'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return this.pairs.has(keyPair(baseAsset, quoteAsset));
  }

  private async getMidPrice(request: QuoteRequest): Promise<number> {
    const rawMid =
      (await this.priceFeed?.({
        baseAsset: request.baseAsset,
        quoteAsset: request.quoteAsset,
      })) ?? 1;
    const mid = Number(rawMid);
    if (!Number.isFinite(mid) || mid <= 0) {
      throw new Error(`Invalid mock DEX mid price for ${request.baseAsset}/${request.quoteAsset}: ${rawMid}`);
    }
    return mid;
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', 'Pair not listed on mock DEX');
    }
    if (this.rng() < this.failureRate) {
      return err('SIMULATED_FAILURE', 'Randomized mock failure');
    }

    const slip = Math.min(this.maxSlippageBps, 1 + Math.floor(this.rng() * this.maxSlippageBps));
    let mid: number;
    try {
      mid = await this.getMidPrice(request);
    } catch (error) {
      return err('INVALID_PRICE_FEED', error instanceof Error ? error.message : 'Invalid mock DEX price feed');
    }
    const spreadAdj = (this.spreadBps / 10_000) * mid;
    const price =
      request.side === 'buy' ? String(mid + spreadAdj) : String(Math.max(0.0001, mid - spreadAdj));

    const sizeIn = Number(request.size);
    const feeFactor = 1 - this.feeBps / 10_000;
    const slipFactor = 1 - slip / 10_000;
    const sizeOut =
      request.side === 'buy'
        ? String((sizeIn / Number(price)) * feeFactor * slipFactor)
        : String(sizeIn * Number(price) * feeFactor * slipFactor);

    const q: QuoteResponse = {
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut,
      price,
      feeBps: this.feeBps,
      expectedSlippageBps: slip,
      validUntil: new Date(Date.now() + 60_000).toISOString(),
      raw: { mock: true, midPrice: String(mid) },
    };
    return ok(q);
  }

  async execute(context: ExecuteContext) {
    if (this.rng() < this.failureRate) {
      return err('SIMULATED_FAILURE', 'Randomized mock execution failure');
    }
    const now = new Date().toISOString();
    if (context.mode === 'simulate') {
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '0',
        avgPrice: '1',
        completedAt: now,
        raw: { mock: true },
      });
    }
    return ok({
      id: randomUUID(),
      intentId: context.intentId,
      adapterId: this.id,
      status: 'submitted' as const,
      txId: `0xmock_${randomUUID().slice(0, 8)}`,
      completedAt: now,
      raw: { mock: true, note: 'live path stub' },
    });
  }

  async getDepth(): Promise<{ bids: string[]; asks: string[] }> {
    return { bids: [], asks: [] };
  }
}
