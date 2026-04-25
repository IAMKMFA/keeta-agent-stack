import type { AdapterHealth, CapabilityMap, VenueKind } from '@keeta-agent-stack/types';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';

export type CapabilityPair = CapabilityMap['pairs'][number];

export interface AdapterPairFilter {
  base: string;
  quote: string;
}

export interface AdapterDiscoveryFilter {
  kind?: VenueKind;
  pair?: AdapterPairFilter;
  baseAsset?: string;
  quoteAsset?: string;
  feature?: string;
  features?: string[];
  limit?: number;
}

export interface DiscoveredAdapter {
  adapter: VenueAdapter;
  capabilities: CapabilityMap;
}

function featureMatches(capabilities: CapabilityMap, filter: AdapterDiscoveryFilter): boolean {
  const required = [...(filter.feature ? [filter.feature] : []), ...(filter.features ?? [])];
  return required.every((feature) => capabilities.features.includes(feature));
}

function assetMatches(capabilities: CapabilityMap, filter: AdapterDiscoveryFilter): boolean {
  return capabilities.pairs.some((pair) => {
    if (filter.baseAsset && pair.base !== filter.baseAsset) return false;
    if (filter.quoteAsset && pair.quote !== filter.quoteAsset) return false;
    return true;
  });
}

function pairMatches(pair: CapabilityPair, filter: AdapterDiscoveryFilter): boolean {
  if (filter.pair && (pair.base !== filter.pair.base || pair.quote !== filter.pair.quote))
    return false;
  if (filter.baseAsset && pair.base !== filter.baseAsset) return false;
  if (filter.quoteAsset && pair.quote !== filter.quoteAsset) return false;
  return true;
}

export class AdapterRegistry {
  private readonly adapters = new Map<string, VenueAdapter>();

  register(adapter: VenueAdapter): void {
    this.adapters.set(adapter.id, adapter);
  }

  list(): VenueAdapter[] {
    return [...this.adapters.values()];
  }

  get(id: string): VenueAdapter | undefined {
    return this.adapters.get(id);
  }

  async healthAll(): Promise<AdapterHealth[]> {
    const out: AdapterHealth[] = [];
    for (const a of this.adapters.values()) {
      out.push(await a.healthCheck());
    }
    return out;
  }

  async discoverAdapters(filter: AdapterDiscoveryFilter = {}): Promise<DiscoveredAdapter[]> {
    const adapters = filter.limit === undefined ? this.list() : this.list().slice(0, filter.limit);
    const discovered: DiscoveredAdapter[] = [];

    for (const adapter of adapters) {
      if (filter.kind && adapter.kind !== filter.kind) continue;
      if (filter.pair && !adapter.supportsPair(filter.pair.base, filter.pair.quote)) continue;

      const needsCapabilities =
        filter.feature !== undefined ||
        (filter.features?.length ?? 0) > 0 ||
        filter.baseAsset !== undefined ||
        filter.quoteAsset !== undefined ||
        filter.pair === undefined;
      const capabilities = needsCapabilities ? await adapter.getCapabilities() : undefined;

      if (capabilities) {
        if (!featureMatches(capabilities, filter)) continue;
        if ((filter.baseAsset || filter.quoteAsset) && !assetMatches(capabilities, filter))
          continue;
        if (
          filter.pair &&
          !capabilities.pairs.some((pair) => adapter.supportsPair(pair.base, pair.quote))
        )
          continue;
        discovered.push({ adapter, capabilities });
        continue;
      }

      discovered.push({ adapter, capabilities: await adapter.getCapabilities() });
    }

    return discovered;
  }

  async findAdapters(filter: AdapterDiscoveryFilter = {}): Promise<VenueAdapter[]> {
    return (await this.discoverAdapters(filter)).map(({ adapter }) => adapter);
  }

  async listPairs(filter: AdapterDiscoveryFilter = {}): Promise<CapabilityPair[]> {
    const pairs = new Map<string, CapabilityPair>();
    for (const { adapter, capabilities } of await this.discoverAdapters(filter)) {
      for (const pair of capabilities.pairs) {
        if (!adapter.supportsPair(pair.base, pair.quote)) continue;
        if (!pairMatches(pair, filter)) continue;
        pairs.set(`${pair.base}:${pair.quote}`, pair);
      }
    }
    return [...pairs.values()];
  }

  async listAssets(filter: AdapterDiscoveryFilter = {}): Promise<string[]> {
    const assets = new Set<string>();
    for (const pair of await this.listPairs(filter)) {
      assets.add(pair.base);
      assets.add(pair.quote);
    }
    return [...assets];
  }
}
