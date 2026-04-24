/**
 * Adapter template — copy this file into a new package and replace the TODOs
 * with your venue's real implementation.
 *
 * The full step-by-step guide lives at docs/creating-new-adapter.md.
 *
 * Contract reminders:
 *   - `id`: a stable identifier used by routing weights and audit logs.
 *   - `kind`: one of 'dex' | 'anchor' | 'transfer' (see VenueKind in types).
 *   - `getQuote`: pure function over the request — never side-effects.
 *   - `execute`: idempotent on `context.intentId`; never mutate ledger state
 *     during 'simulate' mode.
 *   - Throw NotImplementedError for any code path your real venue cannot
 *     support — the routing engine treats UNSUPPORTED_PAIR / NOT_IMPLEMENTED
 *     as soft failures and falls back to alternates.
 */
import type {
  DexVenueAdapter,
  ExecuteAdapterResult,
  ExecuteContext,
} from '@keeta-agent-stack/adapter-base';
import { err } from '@keeta-agent-stack/adapter-base';
import type {
  AdapterHealth,
  CapabilityMap,
  QuoteRequest,
} from '@keeta-agent-stack/types';

export interface TemplateAdapterConfig {
  /** Venue id surfaced in routes, metrics, and audit events. */
  id?: string;
  /** Trading pairs this adapter advertises. Defaults to KTA/USDC. */
  supportedPairs?: Array<{ base: string; quote: string }>;
}

export class NotImplementedError extends Error {
  readonly code = 'NOT_IMPLEMENTED';
  constructor(message: string) {
    super(message);
    this.name = 'NotImplementedError';
  }
}

function pairKey(base: string, quote: string): string {
  return `${base}:${quote}`;
}

export class TemplateAdapter implements DexVenueAdapter {
  readonly id: string;
  readonly kind = 'dex' as const;
  private readonly pairs: Set<string>;

  constructor(cfg: TemplateAdapterConfig = {}) {
    this.id = cfg.id ?? 'template-adapter';
    this.pairs = new Set(
      (cfg.supportedPairs ?? [{ base: 'KTA', quote: 'USDC' }]).map((p) => pairKey(p.base, p.quote))
    );
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: true,
      latencyMs: 0,
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
      features: ['quote'],
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return this.pairs.has(pairKey(baseAsset, quoteAsset));
  }

  async getQuote(_request: QuoteRequest) {
    if (!this.supportsPair(_request.baseAsset, _request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', `Pair ${_request.baseAsset}/${_request.quoteAsset} not listed`);
    }
    // TODO: replace with a real upstream call.
    return err('NOT_IMPLEMENTED', 'TemplateAdapter.getQuote needs implementation');
  }

  async execute(_context: ExecuteContext): Promise<ExecuteAdapterResult> {
    // TODO: implement live execution. Throwing here means routing will keep
    // this adapter visible for capability discovery but never select it for
    // settlement until the real path lands.
    throw new NotImplementedError(
      `TemplateAdapter.execute not implemented (intent ${_context.intentId})`
    );
  }
}
