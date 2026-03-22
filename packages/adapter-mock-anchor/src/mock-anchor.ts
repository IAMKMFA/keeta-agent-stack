import type { AnchorVenueAdapter, ExecuteContext } from '@keeta-agent-sdk/adapter-base';
import { err, ok } from '@keeta-agent-sdk/adapter-base';
import type { AdapterHealth, CapabilityMap, QuoteRequest } from '@keeta-agent-sdk/types';
import { sleep } from '@keeta-agent-sdk/utils';
import { randomUUID } from 'node:crypto';

export type AnchorCompletionState = 'pending' | 'completed' | 'failed';

export interface MockAnchorConfig {
  id?: string;
  settlementDelayMs: number;
  feeFixed: string;
  /** Relative weights for terminal states (used with RNG) */
  stateWeights?: Partial<Record<AnchorCompletionState, number>>;
  seed?: string;
  supportedPairs?: Array<{ base: string; quote: string }>;
}

function createRng(seed?: string): () => number {
  let s = 987654321;
  if (seed) {
    for (let i = 0; i < seed.length; i++) {
      s = (Math.imul(17, s) + seed.charCodeAt(i)) | 0;
    }
  } else {
    s = (Math.random() * 0x7fffffff) | 0;
  }
  return () => {
    s = (s * 1103515245 + 12345) >>> 0;
    return (s >>> 0) / 0xffffffff;
  };
}

function keyPair(base: string, quote: string): string {
  return `${base}:${quote}`;
}

export class MockAnchorAdapter implements AnchorVenueAdapter {
  readonly id: string;
  readonly kind = 'anchor' as const;
  private readonly settlementDelayMs: number;
  private readonly feeFixed: string;
  private readonly rng: () => number;
  private readonly pairs: Set<string>;
  private readonly weights: Record<AnchorCompletionState, number>;

  constructor(cfg: MockAnchorConfig) {
    this.id = cfg.id ?? 'mock-anchor';
    this.settlementDelayMs = cfg.settlementDelayMs;
    this.feeFixed = cfg.feeFixed;
    this.rng = createRng(cfg.seed);
    this.pairs = new Set(
      (cfg.supportedPairs ?? [{ base: 'KTA', quote: 'ETH' }]).map((p) => keyPair(p.base, p.quote))
    );
    this.weights = {
      pending: cfg.stateWeights?.pending ?? 0,
      completed: cfg.stateWeights?.completed ?? 0.9,
      failed: cfg.stateWeights?.failed ?? 0.1,
    };
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 2 + Math.floor(this.rng() * 10),
      checkedAt: new Date().toISOString(),
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'anchor',
      pairs: [...this.pairs].map((k) => {
        const [base, quote] = k.split(':');
        return { base: base!, quote: quote! };
      }),
      features: ['bridge', 'settlement'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return this.pairs.has(keyPair(baseAsset, quoteAsset));
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', 'Pair not supported by mock anchor');
    }
    const fee = Number(this.feeFixed);
    const sizeIn = Number(request.size);
    const sizeOut = String(Math.max(0, sizeIn - fee));

    return ok({
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut,
      price: '1',
      feeBps: 0,
      expectedSlippageBps: 0,
      validUntil: new Date(Date.now() + 120_000).toISOString(),
      raw: { mockAnchor: true, feeFixed: this.feeFixed },
    });
  }

  private pickState(): Exclude<AnchorCompletionState, 'pending'> {
    const r = this.rng();
    const wFailed = this.weights.failed;
    const wDone = this.weights.completed;
    const sum = wFailed + wDone;
    if (sum <= 0) return 'completed';
    if (r < wFailed / sum) return 'failed';
    return 'completed';
  }

  async execute(context: ExecuteContext) {
    if (this.settlementDelayMs > 0) {
      await sleep(this.settlementDelayMs);
    }
    const terminal = this.pickState();
    const now = new Date().toISOString();

    if (terminal === 'failed') {
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'failed' as const,
        errorCode: 'ANCHOR_FAILED',
        errorMessage: 'Mock anchor settlement failed',
        completedAt: now,
        raw: { mockAnchor: true },
      });
    }

    if (context.mode === 'simulate') {
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '0',
        avgPrice: '1',
        completedAt: now,
        raw: { mockAnchor: true },
      });
    }

    return ok({
      id: randomUUID(),
      intentId: context.intentId,
      adapterId: this.id,
      status: 'submitted' as const,
      txId: `anchor_${randomUUID().slice(0, 8)}`,
      completedAt: now,
      raw: { mockAnchor: true },
    });
  }

  async initiateSettlement(context: ExecuteContext) {
    return this.execute(context);
  }
}
