import type { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';
import type { AdapterHealth, CapabilityMap, ExecutionIntent, QuoteRequest, QuoteResponse, RoutePlan, RouteStep } from '@keeta-agent-stack/types';
import { randomUUID } from 'node:crypto';

export interface RouterOptions {
  maxQuotes: number;
  maxHops: number;
  weights?: {
    fee: number;
    slippage: number;
    hops: number;
    reliability: number;
  };
}

export interface RouteBuildOptions {
  canUseAdapter?: (adapter: VenueAdapter) => boolean | Promise<boolean>;
  describeAdapter?: (
    adapter: VenueAdapter
  ) =>
    | Partial<Pick<RouteStep, 'paymentAnchorId' | 'routingContext'>>
    | Promise<Partial<Pick<RouteStep, 'paymentAnchorId' | 'routingContext'>> | undefined>
    | undefined;
  scoreAdapter?: (
    adapter: VenueAdapter,
    context: {
      intent: ExecutionIntent;
      request: QuoteRequest;
      quote: QuoteResponse;
      health: AdapterHealth;
    }
  ) => number | Promise<number>;
}

const defaultWeights = {
  fee: 1,
  slippage: 1,
  hops: 0.5,
  reliability: 0.25,
};

export function scoreRoute(input: {
  totalFeeBps: number;
  expectedSlippageBps: number;
  hopCount: number;
  healthOk: boolean;
  adapterScoreAdjustment?: number;
}, w = defaultWeights): number {
  const reliability = input.healthOk ? 1 : 0;
  return (
    w.fee * -input.totalFeeBps +
    w.slippage * -input.expectedSlippageBps +
    w.hops * -input.hopCount +
    w.reliability * reliability +
    (input.adapterScoreAdjustment ?? 0)
  );
}

export class Router {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly opts: RouterOptions = { maxQuotes: 8, maxHops: 3 }
  ) {}

  async buildPlans(
    intent: ExecutionIntent,
    buildOpts: RouteBuildOptions = {}
  ): Promise<{ best: RoutePlan; alternates: RoutePlan[] }> {
    const eligibleAdapters: Array<{ adapter: VenueAdapter; capabilities: CapabilityMap }> = [];
    for (const { adapter, capabilities } of await this.registry.discoverAdapters({ limit: this.opts.maxQuotes })) {
      if (buildOpts.canUseAdapter && !(await buildOpts.canUseAdapter(adapter))) continue;
      if (!capabilities.pairs.some((pair) => adapter.supportsPair(pair.base, pair.quote))) continue;
      eligibleAdapters.push({ adapter, capabilities });
    }
    const w = this.opts.weights ?? defaultWeights;
    const pairIndex = new Map<string, Array<{ adapter: VenueAdapter; pair: CapabilityMap['pairs'][number] }>>();
    const knownAssets = new Set<string>([intent.baseAsset, intent.quoteAsset]);
    for (const { adapter, capabilities } of eligibleAdapters) {
      for (const pair of capabilities.pairs) {
        if (!adapter.supportsPair(pair.base, pair.quote)) continue;
        knownAssets.add(pair.base);
        knownAssets.add(pair.quote);
        const key = `${pair.base}:${pair.quote}`;
        const entries = pairIndex.get(key) ?? [];
        entries.push({ adapter, pair });
        pairIndex.set(key, entries);
      }
    }

    const candidatePaths: Array<Array<{ adapter: VenueAdapter; baseAsset: string; quoteAsset: string }>> = [];
    const maxHops = Math.max(1, this.opts.maxHops);
    const visit = (
      currentAsset: string,
      depth: number,
      path: Array<{ adapter: VenueAdapter; baseAsset: string; quoteAsset: string }>,
      seenAssets: Set<string>
    ) => {
      if (depth >= maxHops) return;
      for (const nextAsset of knownAssets) {
        const edgeKey = `${currentAsset}:${nextAsset}`;
        const edges = pairIndex.get(edgeKey);
        if (!edges?.length) continue;
        for (const edge of edges) {
          const nextPath = [...path, { adapter: edge.adapter, baseAsset: currentAsset, quoteAsset: nextAsset }];
          if (nextAsset === intent.quoteAsset) {
            candidatePaths.push(nextPath);
            continue;
          }
          if (seenAssets.has(nextAsset)) continue;
          const nextSeen = new Set(seenAssets);
          nextSeen.add(nextAsset);
          visit(nextAsset, depth + 1, nextPath, nextSeen);
        }
      }
    };
    visit(intent.baseAsset, 0, [], new Set([intent.baseAsset]));

    const plans: RoutePlan[] = [];
    const dedupe = new Set<string>();
    for (const candidatePath of candidatePaths) {
      const signature = candidatePath
        .map((step) => `${step.adapter.id}:${step.baseAsset}:${step.quoteAsset}`)
        .join('>');
      if (dedupe.has(signature)) continue;
      dedupe.add(signature);

      let currentSize = intent.size;
      const steps: RouteStep[] = [];
      let totalFeeBps = 0;
      let expectedSlippageBps = 0;
      let adapterScoreAdjustmentTotal = 0;
      let healthOk = true;
      let failed = false;

      for (let stepIndex = 0; stepIndex < candidatePath.length; stepIndex++) {
        const candidateStep = candidatePath[stepIndex]!;
        const request: QuoteRequest = {
          adapterId: candidateStep.adapter.id,
          baseAsset: candidateStep.baseAsset,
          quoteAsset: candidateStep.quoteAsset,
          side: intent.side,
          size: currentSize,
          intentId: intent.id,
        };
        const q = await candidateStep.adapter.getQuote(request);
        if (!q.success) {
          failed = true;
          break;
        }
        const health = await candidateStep.adapter.healthCheck();
        if (!health.ok) healthOk = false;
        const adapterDescription = (await buildOpts.describeAdapter?.(candidateStep.adapter)) ?? {};
        const adapterScoreAdjustment =
          (await buildOpts.scoreAdapter?.(candidateStep.adapter, {
            intent,
            request,
            quote: q.data,
            health,
          })) ?? 0;
        const mergedRoutingContext =
          adapterDescription.routingContext !== undefined || adapterScoreAdjustment !== 0
            ? {
                scoreAdjustment: adapterScoreAdjustment,
                scoreAdjustments: [],
                ...adapterDescription.routingContext,
              }
            : undefined;
        steps.push({
          stepIndex,
          adapterId: candidateStep.adapter.id,
          venueKind: candidateStep.adapter.kind,
          ...adapterDescription,
          ...(mergedRoutingContext ? { routingContext: mergedRoutingContext } : {}),
          baseAsset: candidateStep.baseAsset,
          quoteAsset: candidateStep.quoteAsset,
          side: intent.side,
          sizeIn: currentSize,
          sizeOutEstimate: q.data.sizeOut,
          feeBps: q.data.feeBps,
          quote: q.data,
        });
        currentSize = q.data.sizeOut;
        totalFeeBps += q.data.feeBps;
        expectedSlippageBps += q.data.expectedSlippageBps;
        adapterScoreAdjustmentTotal += adapterScoreAdjustment;
      }

      if (failed || steps.length === 0) continue;
      const hopCount = steps.length;
      if (hopCount > maxHops) continue;
      plans.push({
        id: randomUUID(),
        intentId: intent.id,
        steps,
        totalFeeBps,
        expectedSlippageBps,
        hopCount,
        score: scoreRoute(
          {
            totalFeeBps,
            expectedSlippageBps,
            hopCount,
            healthOk,
            adapterScoreAdjustment: adapterScoreAdjustmentTotal,
          },
          w
        ),
        createdAt: new Date().toISOString(),
      });
    }

    plans.sort((a, b) => b.score - a.score);
    if (plans.length === 0) {
      throw new Error('No route plans available from adapters');
    }
    const [best, ...alternates] = plans;
    return { best: best!, alternates };
  }
}
