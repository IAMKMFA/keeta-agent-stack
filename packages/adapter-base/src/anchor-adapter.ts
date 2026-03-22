import type { ExecuteContext } from './context.js';
import type { ExecuteAdapterResult } from './result.js';
import type { VenueAdapter } from './venue-adapter.js';

/** Anchor/settlement venues: thin wrappers over execute for naming clarity. */
export interface AnchorVenueAdapter extends VenueAdapter {
  readonly kind: 'anchor';
  initiateSettlement(context: ExecuteContext): Promise<ExecuteAdapterResult>;
}
