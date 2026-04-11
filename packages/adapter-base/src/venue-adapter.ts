import type {
  AdapterHealth,
  CapabilityMap,
  QuoteRequest,
} from '@keeta-agent-sdk/types';
import type { ExecuteContext } from './context.js';
import type { ExecuteAdapterResult, QuoteAdapterResult } from './result.js';
import type { VenueKind } from '@keeta-agent-sdk/types';

/** Base contract for any venue (DEX, anchor bridge, native transfer). */
export interface VenueAdapter {
  readonly id: string;
  readonly kind: VenueKind;
  healthCheck(): Promise<AdapterHealth>;
  getCapabilities(): CapabilityMap | Promise<CapabilityMap>;
  supportsPair(baseAsset: string, quoteAsset: string): boolean;
  getQuote(request: QuoteRequest): Promise<QuoteAdapterResult>;
  execute(context: ExecuteContext): Promise<ExecuteAdapterResult>;
}
