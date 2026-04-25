import type { DexVenueAdapter, ExecuteContext } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type {
  AdapterHealth,
  CapabilityMap,
  QuoteRequest,
  QuoteResponse,
} from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

export interface MockCexOrderBook {
  /** Top-of-book mid price for the supported pair, e.g. '1.02'. */
  mid: string;
  /** Half-spread in basis points (e.g. 8 means asks=mid*1.0008, bids=mid*0.9992). */
  spreadBps?: number;
}

export interface MockCexConfig {
  id?: string;
  /** Maker/taker fee in bps. */
  feeBps?: number;
  /** Latency floor in ms; the adapter sleeps min..min+jitter on every call. */
  latencyMs?: number;
  latencyJitterMs?: number;
  /** In-memory order book per `BASE/QUOTE`. Defaults to KTA/USDC at mid 1.00. */
  books?: Record<string, MockCexOrderBook>;
  /** Optional starting balances, indexed by asset symbol. */
  balances?: Record<string, number>;
}

interface FilledOrder {
  id: string;
  intentId: string;
  side: 'buy' | 'sell';
  base: string;
  quote: string;
  filledSize: string;
  avgPrice: string;
  feePaid: string;
  filledAt: string;
}

function pairKey(base: string, quote: string): string {
  return `${base}/${quote}`;
}

const ENV_FLAG = 'KEETA_ENABLE_MOCK_CEX';

/**
 * Lightweight in-memory CEX-style adapter. Useful for examples that need a
 * deterministic central-limit-order-book counterpart to MockDexAdapter.
 *
 * Disabled by default. Enable in long-lived workers via the
 * `KEETA_ENABLE_MOCK_CEX=true` env flag (the registry factory honours it).
 */
export class MockCexAdapter implements DexVenueAdapter {
  static readonly ENV_FLAG = ENV_FLAG;
  readonly id: string;
  readonly kind = 'dex' as const;

  private readonly feeBps: number;
  private readonly latencyMs: number;
  private readonly latencyJitterMs: number;
  private readonly books: Map<string, MockCexOrderBook>;
  private readonly balances: Map<string, number>;
  private readonly fills: FilledOrder[] = [];

  constructor(cfg: MockCexConfig = {}) {
    this.id = cfg.id ?? 'mock-cex';
    this.feeBps = cfg.feeBps ?? 10;
    this.latencyMs = cfg.latencyMs ?? 2;
    this.latencyJitterMs = cfg.latencyJitterMs ?? 3;
    const bookEntries = Object.entries(cfg.books ?? { 'KTA/USDC': { mid: '1', spreadBps: 8 } });
    this.books = new Map(bookEntries);
    this.balances = new Map(Object.entries(cfg.balances ?? { USDC: 1_000_000, KTA: 1_000_000 }));
  }

  /** Read whether the env flag enables this adapter. */
  static isEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const v = env[ENV_FLAG];
    return v === '1' || v === 'true' || v === 'TRUE';
  }

  async healthCheck(): Promise<AdapterHealth> {
    await this.simulateLatency();
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: this.latencyMs,
      checkedAt: new Date().toISOString(),
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: 'dex',
      pairs: [...this.books.keys()].map((k) => {
        const [base, quote] = k.split('/');
        return { base: base!, quote: quote! };
      }),
      features: ['quote', 'limit-order', 'post-only', 'orderbook'],
    };
  }

  supportsPair(base: string, quote: string): boolean {
    return this.books.has(pairKey(base, quote));
  }

  async getQuote(req: QuoteRequest) {
    await this.simulateLatency();
    const book = this.books.get(pairKey(req.baseAsset, req.quoteAsset));
    if (!book) {
      return err('UNSUPPORTED_PAIR', `No order book for ${req.baseAsset}/${req.quoteAsset}`);
    }
    const mid = Number(book.mid);
    const halfSpread = (book.spreadBps ?? 0) / 10_000;
    const price = req.side === 'buy' ? mid * (1 + halfSpread) : mid * (1 - halfSpread);
    const sizeIn = Number(req.size);
    const grossOut = req.side === 'buy' ? sizeIn / price : sizeIn * price;
    const sizeOut = grossOut * (1 - this.feeBps / 10_000);

    const q: QuoteResponse = {
      adapterId: this.id,
      baseAsset: req.baseAsset,
      quoteAsset: req.quoteAsset,
      side: req.side,
      sizeIn: req.size,
      sizeOut: sizeOut.toFixed(8),
      price: price.toFixed(8),
      feeBps: this.feeBps,
      expectedSlippageBps: book.spreadBps ?? 0,
      validUntil: new Date(Date.now() + 30_000).toISOString(),
      raw: { mock: true, venue: 'mock-cex' },
    };
    return ok(q);
  }

  async execute(context: ExecuteContext) {
    await this.simulateLatency();
    const step = context.step ?? this.fallbackStep();
    if (!step) {
      return err('MISSING_STEP', 'mock-cex has no books configured to fall back to');
    }
    const base = step.baseAsset;
    const quote = step.quoteAsset;
    const book = this.books.get(pairKey(base, quote));
    if (!book) {
      return err('UNSUPPORTED_PAIR', `No order book for ${base}/${quote}`);
    }

    const side = step.side;
    const mid = Number(book.mid);
    const halfSpread = (book.spreadBps ?? 0) / 10_000;
    const price = side === 'buy' ? mid * (1 + halfSpread) : mid * (1 - halfSpread);
    const sizeIn = Number(step.sizeIn);
    const grossOut = side === 'buy' ? sizeIn / price : sizeIn * price;
    const fee = grossOut * (this.feeBps / 10_000);
    const filledSize = grossOut - fee;

    if (context.mode === 'live') {
      this.applyBalances(side, base, quote, sizeIn, filledSize);
    }

    const fill: FilledOrder = {
      id: randomUUID(),
      intentId: context.intentId,
      side,
      base,
      quote,
      filledSize: filledSize.toFixed(8),
      avgPrice: price.toFixed(8),
      feePaid: fee.toFixed(8),
      filledAt: new Date().toISOString(),
    };
    this.fills.push(fill);

    if (context.mode === 'simulate') {
      return ok({
        id: fill.id,
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        filledSize: fill.filledSize,
        avgPrice: fill.avgPrice,
        completedAt: fill.filledAt,
        raw: { mock: true, fee: fill.feePaid, venue: 'mock-cex' },
      });
    }

    return ok({
      id: fill.id,
      intentId: context.intentId,
      adapterId: this.id,
      status: 'confirmed' as const,
      txId: `cex_${fill.id.slice(0, 8)}`,
      filledSize: fill.filledSize,
      avgPrice: fill.avgPrice,
      completedAt: fill.filledAt,
      raw: { mock: true, fee: fill.feePaid, venue: 'mock-cex' },
    });
  }

  /** Read-only access for tests/dashboards. */
  getFills(): readonly FilledOrder[] {
    return this.fills;
  }

  /** Read-only access for tests/dashboards. */
  getBalance(asset: string): number {
    return this.balances.get(asset) ?? 0;
  }

  private applyBalances(
    side: 'buy' | 'sell',
    base: string,
    quote: string,
    sizeIn: number,
    filledSize: number
  ): void {
    if (side === 'buy') {
      this.balances.set(quote, this.getBalance(quote) - sizeIn);
      this.balances.set(base, this.getBalance(base) + filledSize);
    } else {
      this.balances.set(base, this.getBalance(base) - sizeIn);
      this.balances.set(quote, this.getBalance(quote) + filledSize);
    }
  }

  private fallbackStep(): ExecuteContext['step'] | undefined {
    const first = [...this.books.keys()][0];
    if (!first) return undefined;
    const [base, quote] = first.split('/');
    return {
      stepIndex: 0,
      adapterId: this.id,
      baseAsset: base!,
      quoteAsset: quote!,
      side: 'buy',
      sizeIn: '1',
      sizeOutEstimate: '1',
      feeBps: this.feeBps,
    };
  }

  private async simulateLatency(): Promise<void> {
    if (this.latencyMs <= 0 && this.latencyJitterMs <= 0) return;
    const jitter = this.latencyJitterMs > 0 ? Math.floor(Math.random() * this.latencyJitterMs) : 0;
    await new Promise((r) => setTimeout(r, this.latencyMs + jitter));
  }
}
