import type {
  AdapterSummary,
  AvailableRail,
  RailTransport,
  SupportLevel,
  VenueKind,
} from '@keeta-agent-stack/types';

export type { RailTransport };

export interface RailMetadataEntry extends AvailableRail {
  transport: RailTransport;
  /** Whether this rail supports initiating managed transfers (as opposed to only persistent forwarding addresses). */
  supportsManagedTransfer?: boolean;
}

interface RailDefinition {
  id: string;
  name: string;
  kind: VenueKind;
  transport: RailTransport;
  production: boolean;
  supportLevel?: SupportLevel;
  description: string;
  supportsManagedTransfer?: boolean;
}

/**
 * Rail catalog, grouped by transport. The upstream identifiers (e.g. `ACH_DEBIT`) come from
 * `@keetanetwork/anchor`'s `FiatPullRails` / `FiatPushRails` / `CryptoRails` unions; we mirror
 * them here so the control plane can advertise them without pulling anchor types into shared
 * schemas.
 */
const RAIL_CATALOG: RailDefinition[] = [
  {
    id: 'mock-dex',
    name: 'Mock DEX',
    kind: 'dex',
    transport: 'native',
    production: false,
    description:
      'Non-production mock DEX adapter for local development, demos, and simulation flows.',
  },
  {
    id: 'mock-anchor',
    name: 'Mock Anchor',
    kind: 'anchor',
    transport: 'fiat-push',
    production: false,
    description:
      'Non-production mock payment anchor adapter for development and end-to-end testing.',
  },
  {
    id: 'keeta-transfer',
    name: 'Keeta Transfer',
    kind: 'transfer',
    transport: 'native',
    production: true,
    description: 'Native Keeta transfer rail for direct on-network asset movement.',
    supportsManagedTransfer: true,
  },
  {
    id: 'oracle-rail-cctp-usdc',
    name: 'Oracle CCTP USDC Rail',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Oracle-backed USDC transfer rail intended for live partner-backed payment flows.',
    supportsManagedTransfer: true,
  },
  {
    id: 'x402',
    name: 'x402 Agent Payment',
    kind: 'agent-payment',
    transport: 'agent-payment',
    production: false,
    supportLevel: 'simulatable',
    description: 'Simulated HTTP 402 agent-payment rail for per-request stablecoin API payments.',
  },
  {
    id: 'pay-sh',
    name: 'pay.sh API Gateway',
    kind: 'agent-payment',
    transport: 'agent-payment',
    production: false,
    supportLevel: 'simulatable',
    description:
      'Simulated pay.sh API discovery and payment rail for Google Cloud-style agent API calls.',
  },
  {
    id: 'mpp',
    name: 'Machine Payments Protocol',
    kind: 'agent-payment',
    transport: 'agent-payment',
    production: false,
    supportLevel: 'simulatable',
    description: 'Simulated Machine Payments Protocol rail for lifecycle-aware agent payments.',
  },

  {
    id: 'anchor-ach-debit',
    name: 'ACH Debit (Pull)',
    kind: 'anchor',
    transport: 'fiat-pull',
    production: true,
    description: 'Pull USD fiat from linked bank accounts via ACH debit (anchor `ACH_DEBIT`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-card-pull',
    name: 'Card Pull',
    kind: 'anchor',
    transport: 'fiat-pull',
    production: true,
    description: 'Pull fiat from a debit card authorization (anchor `CARD_PULL`).',
    supportsManagedTransfer: true,
  },

  {
    id: 'anchor-ach-push',
    name: 'ACH Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push USD fiat via ACH (anchor `ACH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-wire',
    name: 'Domestic Wire',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push USD fiat via domestic wire (anchor `WIRE`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-wire-intl',
    name: 'International Wire',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push fiat via international wire (anchor `WIRE_INTL_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-sepa-push',
    name: 'SEPA Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push EUR fiat via SEPA (anchor `SEPA_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-pix-push',
    name: 'Pix Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push BRL via Pix (anchor `PIX_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-spei-push',
    name: 'SPEI Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push MXN via SPEI (anchor `SPEI_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-interac-push',
    name: 'Interac Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push CAD via Interac (anchor `INTERAC_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-fps-push',
    name: 'UK FPS',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push GBP via UK Faster Payments (anchor `FPS_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-hk-fps-push',
    name: 'HK FPS',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push HKD via Hong Kong Faster Payment System (anchor `HK_FPS_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-paynow-push',
    name: 'PayNow',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push SGD via PayNow (anchor `PAY_NOW_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-duitnow-push',
    name: 'DuitNow',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push MYR via DuitNow (anchor `DUIT_NOW_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-upi-push',
    name: 'UPI Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push INR via UPI (anchor `UPI_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-bcrpay-push',
    name: 'BCR Pay',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push via BCR Pay (anchor `BCR_PAY_PUSH`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-mobile-wallet',
    name: 'Mobile Wallet',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push to a mobile wallet address (anchor `MOBILE_WALLET`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-card-push',
    name: 'Card Push',
    kind: 'anchor',
    transport: 'fiat-push',
    production: true,
    description: 'Push fiat to a card destination (anchor `CARD_PUSH`).',
    supportsManagedTransfer: true,
  },

  {
    id: 'anchor-evm-send',
    name: 'EVM Send',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Send tokens across EVM chains via an anchor (anchor `EVM_SEND`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-evm-call',
    name: 'EVM Call',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Call an EVM contract via an anchor (anchor `EVM_CALL`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-solana-send',
    name: 'Solana Send',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Send tokens on Solana via an anchor (anchor `SOLANA_SEND`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-bitcoin-send',
    name: 'Bitcoin Send',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Send BTC via an anchor (anchor `BITCOIN_SEND`).',
    supportsManagedTransfer: true,
  },
  {
    id: 'anchor-tron-send',
    name: 'Tron Send',
    kind: 'anchor',
    transport: 'crypto',
    production: true,
    description: 'Send tokens on Tron via an anchor (anchor `TRON_SEND`).',
    supportsManagedTransfer: true,
  },
];

function toEntry(def: RailDefinition): RailMetadataEntry {
  const rail: RailMetadataEntry = {
    id: def.id,
    name: def.name,
    production: def.production,
    kind: def.kind,
    transport: def.transport,
    description: def.description,
  };
  if (def.supportsManagedTransfer !== undefined) {
    rail.supportsManagedTransfer = def.supportsManagedTransfer;
  }
  if (def.supportLevel !== undefined) {
    rail.supportLevel = def.supportLevel;
  }
  return rail;
}

const BUILTIN_RAIL_ENTRIES: RailMetadataEntry[] = RAIL_CATALOG.map(toEntry);

export function listBuiltinRailMetadata(): AvailableRail[] {
  return BUILTIN_RAIL_ENTRIES.map((rail) => ({ ...rail }));
}

export function listBuiltinRailMetadataDetailed(): RailMetadataEntry[] {
  return BUILTIN_RAIL_ENTRIES.map((rail) => ({ ...rail }));
}

export function getBuiltinRailMetadata(id: string): RailMetadataEntry | undefined {
  const found = BUILTIN_RAIL_ENTRIES.find((rail) => rail.id === id);
  return found ? { ...found } : undefined;
}

export function mergeRailMetadata(adapters: AdapterSummary[]): AvailableRail[] {
  return adapters.map((adapter) => {
    const metadata = getBuiltinRailMetadata(adapter.id) as RailMetadataEntry | undefined;
    const rail: AvailableRail = {
      id: adapter.id,
      name: metadata?.name ?? adapter.id,
      production: metadata?.production ?? true,
      kind: metadata?.kind ?? adapter.kind,
      supportLevel: metadata?.supportLevel ?? adapter.supportLevel,
    };
    if (metadata?.description) rail.description = metadata.description;
    if (metadata?.transport) rail.transport = metadata.transport;
    if (metadata?.supportsManagedTransfer !== undefined) {
      rail.supportsManagedTransfer = metadata.supportsManagedTransfer;
    }
    return rail;
  });
}

/**
 * Filter the rail catalog by transport class and/or production flag.
 * Useful for surfacing only production-ready rails in the MCP `keeta_list_available_rails` tool
 * and restricting policy-pack rail allowlists to verified transports.
 */
export function listBuiltinRailsByTransport(opts?: {
  transports?: RailTransport[];
  productionOnly?: boolean;
}): RailMetadataEntry[] {
  const transports = opts?.transports;
  const productionOnly = opts?.productionOnly ?? false;
  return BUILTIN_RAIL_ENTRIES.filter((rail) => {
    if (productionOnly && !rail.production) return false;
    if (transports && transports.length > 0 && !transports.includes(rail.transport)) return false;
    return true;
  }).map((rail) => ({ ...rail }));
}
