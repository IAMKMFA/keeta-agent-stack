import type { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import type { ExecutionIntent, RoutePlan, RouteStep } from '@keeta-agent-sdk/types';
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

const defaultWeights = {
  fee: 1,
  slippage: 1,
  hops: 0.5,
  reliability: 0.25,
};

function scoreRoute(input: {
  totalFeeBps: number;
  expectedSlippageBps: number;
  hopCount: number;
  healthOk: boolean;
}, w = defaultWeights): number {
  const reliability = input.healthOk ? 1 : 0;
  return (
    w.fee * -input.totalFeeBps +
    w.slippage * -input.expectedSlippageBps +
    w.hops * -input.hopCount +
    w.reliability * reliability
  );
}

export class Router {
  constructor(
    private readonly registry: AdapterRegistry,
    private readonly opts: RouterOptions = { maxQuotes: 8, maxHops: 3 }
  ) {}

  async buildPlans(intent: ExecutionIntent): Promise<{ best: RoutePlan; alternates: RoutePlan[] }> {
    const adapters = this.registry.list().slice(0, this.opts.maxQuotes);
    const quotes = await Promise.all(
      adapters
        .filter((a) => a.supportsPair(intent.baseAsset, intent.quoteAsset))
        .map(async (adapter) => {
          const q = await adapter.getQuote({
            adapterId: adapter.id,
            baseAsset: intent.baseAsset,
            quoteAsset: intent.quoteAsset,
            side: intent.side,
            size: intent.size,
            intentId: intent.id,
          });
          return { adapter, q };
        })
    );

    const ok = quotes.filter((x) => x.q.success);
    const plans: RoutePlan[] = [];
    const w = this.opts.weights ?? defaultWeights;

    for (const { adapter, q } of ok) {
      if (!q.success) continue;
      const health = await adapter.healthCheck();
      const step: RouteStep = {
        stepIndex: 0,
        adapterId: adapter.id,
        baseAsset: intent.baseAsset,
        quoteAsset: intent.quoteAsset,
        side: intent.side,
        sizeIn: intent.size,
        sizeOutEstimate: q.data.sizeOut,
        feeBps: q.data.feeBps,
        quote: q.data,
      };
      const hopCount = 1;
      if (hopCount > this.opts.maxHops) continue;

      const plan: RoutePlan = {
        id: randomUUID(),
        intentId: intent.id,
        steps: [step],
        totalFeeBps: q.data.feeBps,
        expectedSlippageBps: q.data.expectedSlippageBps,
        hopCount,
        score: scoreRoute(
          {
            totalFeeBps: q.data.feeBps,
            expectedSlippageBps: q.data.expectedSlippageBps,
            hopCount,
            healthOk: health.ok,
          },
          w
        ),
        createdAt: new Date().toISOString(),
      };
      plans.push(plan);
    }

    plans.sort((a, b) => b.score - a.score);
    if (plans.length === 0) {
      throw new Error('No route plans available from adapters');
    }
    const [best, ...alternates] = plans;
    return { best: best!, alternates };
  }
}
