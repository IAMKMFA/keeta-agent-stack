import type { AdapterHealth } from '@keeta-agent-stack/types';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';

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
}
