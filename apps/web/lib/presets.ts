/**
 * Public web presets use existing `ExecutionIntent`, `VenueAdapter`, router,
 * registry, and policy types. Mock rails here are presentation fixtures only.
 */
import type { ExecuteContext, VenueAdapter } from '@keeta-agent-stack/adapter-base';
import { err, ok } from '@keeta-agent-stack/adapter-base';
import { MppAdapter } from '@keeta-agent-stack/adapter-mpp';
import { PayShAdapter } from '@keeta-agent-stack/adapter-pay-sh';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry/registry';
import { X402Adapter } from '@keeta-agent-stack/adapter-x402';
import { PolicyEngine, type PolicyConfig } from '@keeta-agent-stack/policy';
import { Router } from '@keeta-agent-stack/routing';
import type {
  AdapterHealth,
  CapabilityMap,
  ExecutionIntent,
  PolicyDecision,
  QuoteRequest,
  QuoteResponse,
  RoutePlan,
  SupportLevel,
  VenueKind,
} from '@keeta-agent-stack/types';

export interface DemoPreset {
  id: string;
  title: string;
  eyebrow: string;
  description: string;
  intent: ExecutionIntent;
  policy: PolicyConfig;
  mockRails: MockRailConfig[];
}

export interface MockRailConfig {
  id: string;
  label: string;
  kind: VenueKind;
  supportLevel: SupportLevel;
  pair: { base: string; quote: string };
  feeBps: number;
  slippageBps?: number;
  sizeOutMultiplier?: number;
  features: string[];
}

export interface DemoRouteResult {
  preset: DemoPreset;
  route?: RoutePlan;
  alternates: RoutePlan[];
  policyDecision?: PolicyDecision;
  error?: string;
}

const now = '2026-05-06T00:00:00.000Z';
const walletId = '6ba7b810-9dad-11d1-80b4-00c04fd430c8';

function intent(id: string, baseAsset: string, quoteAsset: string, size = '100'): ExecutionIntent {
  return {
    id,
    walletId,
    baseAsset,
    quoteAsset,
    side: 'sell',
    size,
    maxSlippageBps: 100,
    mode: 'simulate',
    createdAt: now,
  };
}

function defaultPolicy(extra: Partial<PolicyConfig> = {}): PolicyConfig {
  return {
    maxOrderSize: 1_000_000,
    maxSlippageBps: 500,
    venueAllowlist: [],
    assetAllowlist: [],
    liveModeEnabled: false,
    perSessionAgentSpendCapUsd: 5,
    allowedAgentPaymentRails: ['x402', 'pay-sh', 'mpp'],
    ...extra,
  };
}

export const presets: DemoPreset[] = [
  {
    id: 'cross-chain-stable',
    title: 'Base USDC to Solana USDC',
    eyebrow: 'Super Swap',
    description: 'A simulated stablecoin route that settles through Keeta before the Solana hop.',
    intent: intent('550e8400-e29b-41d4-a716-446655441001', 'BASE_USDC', 'SOLANA_USDC'),
    policy: defaultPolicy(),
    mockRails: [
      mockRail('base-keeta', 'Base anchor', 'anchor', 'simulatable', 'BASE_USDC', 'KEETA_USDC', 8),
      mockRail(
        'keeta-solana',
        'Solana stable rail',
        'transfer',
        'simulatable',
        'KEETA_USDC',
        'SOLANA_USDC',
        11
      ),
    ],
  },
  {
    id: 'stable-corridor',
    title: 'Ethereum USDC to Tron USDT',
    eyebrow: 'Corridor',
    description: 'A corridor-style stable route using Keeta as the route center.',
    intent: intent('550e8400-e29b-41d4-a716-446655441002', 'ETHEREUM_USDC', 'TRON_USDT'),
    policy: defaultPolicy(),
    mockRails: [
      mockRail(
        'eth-keeta',
        'Ethereum anchor',
        'anchor',
        'simulatable',
        'ETHEREUM_USDC',
        'KEETA_USDC',
        10
      ),
      mockRail('keeta-tron', 'Tron rail', 'transfer', 'simulatable', 'KEETA_USDC', 'TRON_USDT', 14),
    ],
  },
  {
    id: 'fiat-on-ramp',
    title: 'USD ACH to Base USDC',
    eyebrow: 'Ramp Router',
    description:
      'A mock fiat-onramp route labeled as simulatable until a live ramp adapter exists.',
    intent: intent('550e8400-e29b-41d4-a716-446655441003', 'USD_ACH', 'BASE_USDC', '250'),
    policy: defaultPolicy(),
    mockRails: [
      mockRail(
        'usd-ach-anchor',
        'USD ACH anchor',
        'anchor',
        'simulatable',
        'USD_ACH',
        'KEETA_USD',
        35
      ),
      mockRail(
        'keeta-base-usdc',
        'Base USDC exit',
        'transfer',
        'simulatable',
        'KEETA_USD',
        'BASE_USDC',
        12
      ),
    ],
  },
  {
    id: 'fiat-off-ramp',
    title: 'Base USDC to EUR SEPA',
    eyebrow: 'Ramp Router',
    description: 'A mock off-ramp corridor with Keeta settlement and an EU payout anchor.',
    intent: intent('550e8400-e29b-41d4-a716-446655441004', 'BASE_USDC', 'EUR_SEPA', '250'),
    policy: defaultPolicy(),
    mockRails: [
      mockRail(
        'base-keeta-eur',
        'Base ingress',
        'anchor',
        'simulatable',
        'BASE_USDC',
        'KEETA_EURC',
        14
      ),
      mockRail(
        'eu-sepa-anchor',
        'EU SEPA anchor',
        'anchor',
        'simulatable',
        'KEETA_EURC',
        'EUR_SEPA',
        28
      ),
    ],
  },
  {
    id: 'card-payout',
    title: 'Base USDC to Visa Direct USD',
    eyebrow: 'Payout',
    description: 'A card-payout route shown as simulated, not executable.',
    intent: intent('550e8400-e29b-41d4-a716-446655441005', 'BASE_USDC', 'VISA_DIRECT_USD', '125'),
    policy: defaultPolicy(),
    mockRails: [
      mockRail(
        'base-keeta-usd',
        'Base ingress',
        'anchor',
        'simulatable',
        'BASE_USDC',
        'KEETA_USD',
        14
      ),
      mockRail(
        'visa-direct',
        'Visa Direct payout',
        'anchor',
        'simulatable',
        'KEETA_USD',
        'VISA_DIRECT_USD',
        45
      ),
    ],
  },
  {
    id: 'agent-api-payment',
    title: 'KTA to Gemini API Call',
    eyebrow: 'Agent Payment',
    description: 'A real router path through the new simulated x402 and pay.sh adapters.',
    intent: {
      ...intent('550e8400-e29b-41d4-a716-446655441006', 'KTA', 'GEMINI_API_CALL', '1'),
      metadata: { apiId: 'gemini-generate-content', requestSize: 1024 },
    },
    policy: defaultPolicy({
      perSessionAgentSpendCapUsd: 1,
      allowedAgentPaymentRails: ['x402', 'pay-sh'],
    }),
    mockRails: [],
  },
  {
    id: 'experimental-wormhole',
    title: 'Experimental Wormhole Route',
    eyebrow: 'Honesty Demo',
    description: 'A listed-only route that policy blocks because it is not approved for execution.',
    intent: intent('550e8400-e29b-41d4-a716-446655441007', 'BASE_USDC', 'APTOS_USDC', '50'),
    policy: defaultPolicy({ venueAllowlist: ['keeta-core-only'] }),
    mockRails: [
      mockRail(
        'wormhole-bridge',
        'Wormhole bridge',
        'transfer',
        'listed',
        'BASE_USDC',
        'APTOS_USDC',
        18,
        ['bridge', 'experimental']
      ),
    ],
  },
];

function mockRail(
  id: string,
  label: string,
  kind: VenueKind,
  supportLevel: SupportLevel,
  base: string,
  quote: string,
  feeBps: number,
  features = ['quote', 'simulate']
): MockRailConfig {
  return {
    id,
    label,
    kind,
    supportLevel,
    pair: { base, quote },
    feeBps,
    slippageBps: supportLevel === 'listed' ? 25 : 3,
    sizeOutMultiplier: 1 - feeBps / 10_000,
    features,
  };
}

class PresetRailAdapter implements VenueAdapter {
  readonly id: string;
  readonly kind: VenueKind;

  constructor(private readonly config: MockRailConfig) {
    this.id = config.id;
    this.kind = config.kind;
  }

  async healthCheck(): Promise<AdapterHealth> {
    return {
      adapterId: this.id,
      ok: this.config.supportLevel !== 'listed',
      latencyMs: this.config.supportLevel === 'listed' ? 0 : 32,
      checkedAt: new Date().toISOString(),
      message: this.config.label,
    };
  }

  async getCapabilities(): Promise<CapabilityMap> {
    return {
      adapterId: this.id,
      kind: this.kind,
      pairs: [this.config.pair],
      features: this.config.features,
      supportLevel: this.config.supportLevel,
    };
  }

  supportsPair(baseAsset: string, quoteAsset: string): boolean {
    return baseAsset === this.config.pair.base && quoteAsset === this.config.pair.quote;
  }

  async getQuote(request: QuoteRequest) {
    if (!this.supportsPair(request.baseAsset, request.quoteAsset)) {
      return err('UNSUPPORTED_PAIR', `${this.id} does not support the requested pair`);
    }
    const size = Number(request.size) || 0;
    const multiplier = this.config.sizeOutMultiplier ?? 1;
    const quote: QuoteResponse = {
      adapterId: this.id,
      baseAsset: request.baseAsset,
      quoteAsset: request.quoteAsset,
      side: request.side,
      sizeIn: request.size,
      sizeOut: (size * multiplier).toFixed(6),
      price: multiplier.toFixed(6),
      feeBps: this.config.feeBps,
      expectedSlippageBps: this.config.slippageBps ?? 0,
      raw: {
        supportLevel: this.config.supportLevel,
        label: this.config.label,
        demoOnly: this.config.supportLevel !== 'executable',
      },
    };
    return ok(quote);
  }

  async execute(context: ExecuteContext) {
    if (context.mode === 'simulate') {
      return ok({
        id: `sim-${this.id}`,
        intentId: context.intentId,
        adapterId: this.id,
        status: 'confirmed' as const,
        filledSize: context.step?.sizeIn ?? '0',
        avgPrice: context.step?.quote?.price ?? '1',
        completedAt: new Date().toISOString(),
        raw: { demoOnly: true },
      });
    }
    return err('DEMO_RAIL_NOT_EXECUTABLE', `${this.id} is a preset-only simulated rail`);
  }
}

export function getPreset(id: string): DemoPreset {
  const preset = presets.find((item) => item.id === id);
  if (!preset) throw new Error(`Unknown preset ${id}`);
  return preset;
}

export function createRegistryForPreset(preset: DemoPreset): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(new X402Adapter());
  registry.register(new PayShAdapter());
  registry.register(new MppAdapter());
  for (const rail of preset.mockRails) {
    registry.register(new PresetRailAdapter(rail));
  }
  return registry;
}

export async function buildDemoRoute(presetId: string): Promise<DemoRouteResult> {
  const preset = getPreset(presetId);
  const registry = createRegistryForPreset(preset);
  const router = new Router(registry, { maxQuotes: 12, maxHops: 4 });
  try {
    const { best, alternates } = await router.buildPlans(preset.intent);
    const policyDecision = new PolicyEngine().evaluate({
      intent: preset.intent,
      routePlan: best,
      config: preset.policy,
    });
    return { preset, route: best, alternates, policyDecision };
  } catch (error) {
    return {
      preset,
      alternates: [],
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function listConnectivityRows() {
  const rows = new Map<
    string,
    {
      id: string;
      label: string;
      kind: VenueKind;
      supportLevel: SupportLevel;
      source: 'registered' | 'preset-only';
      features: string[];
    }
  >();

  const registered = createRegistryForPreset(getPreset('agent-api-payment'));
  for (const { adapter, capabilities } of await registered.discoverAdapters()) {
    rows.set(adapter.id, {
      id: adapter.id,
      label: adapter.id,
      kind: adapter.kind,
      supportLevel: capabilities.supportLevel ?? 'listed',
      source: 'registered',
      features: capabilities.features,
    });
  }

  for (const preset of presets) {
    for (const rail of preset.mockRails) {
      rows.set(rail.id, {
        id: rail.id,
        label: rail.label,
        kind: rail.kind,
        supportLevel: rail.supportLevel,
        source: 'preset-only',
        features: rail.features,
      });
    }
  }

  return [...rows.values()].sort((a, b) => a.id.localeCompare(b.id));
}
