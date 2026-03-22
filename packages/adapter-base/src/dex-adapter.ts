import type { VenueAdapter } from './venue-adapter.js';

/** DEX-like venues: swap-style quotes. Optional depth hook for future order books. */
export interface DexVenueAdapter extends VenueAdapter {
  readonly kind: 'dex';
  /** Placeholder for real order book subscription. */
  getDepth?(_base: string, _quote: string): Promise<{ bids: string[]; asks: string[] }>;
}
