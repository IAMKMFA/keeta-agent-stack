/**
 * Solana stub adapter — quote + simulate paths work so routing demos can
 * include Solana-bridged liquidity, but `execute` in 'live' mode throws
 * SolanaNotImplementedError until the real on-chain integration lands.
 *
 * TODO list to make this a production-grade Solana DEX adapter:
 *   - swap @solana/web3.js for a pinned version + dependency injection
 *   - add Jupiter (or 1inch-style aggregator) quote fetching
 *   - sign with KMS-backed Ed25519 keys (no raw secrets in env)
 *   - support priority fees + compute-budget instructions
 *   - persist signature → Keeta intent mapping for resume after restart
 *   - add slot/finality polling + reorg handling for `executionId`
 *   - emit fee + slippage telemetry to the policy engine
 *   - implement true idempotency on (intentId, stepIndex)
 *   - cover with the shared `runAdapterContractSuite` once execute is real
 */
import type { DexVenueAdapter, ExecuteContext } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import type {
  AdapterHealth,
  CapabilityMap,
  QuoteRequest,
  QuoteResponse,
} from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

const ENV_FLAG = 'KEETA_ENABLE_SOLANA_STUB';

export interface SolanaStubConfig {
  id?: string;
  /** Pairs to advertise. Defaults to KTA/USDC + SOL/USDC. */
  supportedPairs?: Array<{ base: string; quote: string }>;
  /** Indicative fee bps (display only). */
  feeBps?: number;
}

export class SolanaNotImplementedError extends Error {
  readonly code = 'NOT_IMPLEMENTED';
  constructor(message: string) {
    super(message);
    this.name = 'SolanaNotImplementedError';
  }
}

function pairKey(base: string, quote: string): string {
  return `${base}:${quote}`;
}

export class SolanaStubAdapter implements DexVenueAdapter {
  static readonly ENV_FLAG = ENV_FLAG;
  readonly id: string;
  readonly kind = 'dex' as const;

  private readonly pairs: Set<string>;
  private readonly feeBps: number;

  constructor(cfg: SolanaStubConfig = {}) {
    this.id = cfg.id ?? 'solana-stub';
    this.feeBps = cfg.feeBps ?? 25;
    this.pairs = new Set(
      (
        cfg.supportedPairs ?? [
          { base: 'KTA', quote: 'USDC' },
          { base: 'SOL', quote: 'USDC' },
        ]
      ).map((p) => pairKey(p.base, p.quote))
    );
  }

  static isEnabled(env: NodeJS.ProcessEnv = process.env): boolean {
    const v = env[ENV_FLAG];
    return v === '1' || v === 'true' || v === 'TRUE';
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 5,
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
      features: ['quote', 'simulate', 'agent-payment-demo', 'solana-stablecoin-demo'],
      supportLevel: 'simulatable',
    };
  }

  supportsPair(base: string, quote: string): boolean {
    return this.pairs.has(pairKey(base, quote));
  }

  async getQuote(req: QuoteRequest) {
    if (!this.supportsPair(req.baseAsset, req.quoteAsset)) {
      return err(
        'UNSUPPORTED_PAIR',
        `Solana stub does not list ${req.baseAsset}/${req.quoteAsset}`
      );
    }
    const sizeIn = Number(req.size);
    const price = req.side === 'buy' ? 1.001 : 0.999;
    const sizeOut =
      (req.side === 'buy' ? sizeIn / price : sizeIn * price) * (1 - this.feeBps / 10_000);
    const q: QuoteResponse = {
      adapterId: this.id,
      baseAsset: req.baseAsset,
      quoteAsset: req.quoteAsset,
      side: req.side,
      sizeIn: req.size,
      sizeOut: sizeOut.toFixed(8),
      price: price.toFixed(8),
      feeBps: this.feeBps,
      expectedSlippageBps: 10,
      validUntil: new Date(Date.now() + 30_000).toISOString(),
      raw: { stub: true, venue: 'solana-stub', notice: 'indicative price only' },
    };
    return ok(q);
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      const now = new Date().toISOString();
      return ok({
        id: randomUUID(),
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '0',
        avgPrice: '1',
        completedAt: now,
        raw: { stub: true, venue: 'solana-stub' },
      });
    }
    throw new SolanaNotImplementedError(
      `SolanaStubAdapter.execute (mode=live) not implemented yet for intent ${context.intentId}. ` +
        'See the TODO list at the top of solana-stub.ts.'
    );
  }
}
