import type { AdapterSummary, AvailableRail } from '@keeta-agent-sdk/types';

const BUILTIN_RAILS: AvailableRail[] = [
  {
    id: 'mock-dex',
    name: 'Mock DEX',
    production: false,
    kind: 'dex',
    description: 'Non-production mock DEX adapter for local development, demos, and simulation flows.',
  },
  {
    id: 'mock-anchor',
    name: 'Mock Anchor',
    production: false,
    kind: 'anchor',
    description: 'Non-production mock payment anchor adapter for development and end-to-end testing.',
  },
  {
    id: 'keeta-transfer',
    name: 'Keeta Transfer',
    production: true,
    kind: 'transfer',
    description: 'Native Keeta transfer rail for direct on-network asset movement.',
  },
  {
    id: 'oracle-rail-cctp-usdc',
    name: 'Oracle CCTP USDC Rail',
    production: true,
    kind: 'anchor',
    description: 'Oracle-backed USDC transfer rail intended for live partner-backed payment flows.',
  },
];

export function listBuiltinRailMetadata(): AvailableRail[] {
  return BUILTIN_RAILS.map((rail) => ({ ...rail }));
}

export function getBuiltinRailMetadata(id: string): AvailableRail | undefined {
  return BUILTIN_RAILS.find((rail) => rail.id === id);
}

export function mergeRailMetadata(adapters: AdapterSummary[]): AvailableRail[] {
  return adapters.map((adapter) => {
    const metadata = getBuiltinRailMetadata(adapter.id);
    return {
      id: adapter.id,
      name: metadata?.name ?? adapter.id,
      production: metadata?.production ?? true,
      kind: metadata?.kind ?? adapter.kind,
      ...(metadata?.description ? { description: metadata.description } : {}),
    };
  });
}
