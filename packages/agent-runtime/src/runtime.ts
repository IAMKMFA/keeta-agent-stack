import type { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import { PolicyEngine, type PolicyConfig } from '@keeta-agent-sdk/policy';
import { Router } from '@keeta-agent-sdk/routing';
import { simulate } from '@keeta-agent-sdk/simulator';
import type { ExecutionIntent, PolicyDecision, RoutePlan, SimulationResult } from '@keeta-agent-sdk/types';
import type { Signer } from '@keeta-agent-sdk/wallet';

export interface AgentRuntimeOptions {
  registry: AdapterRegistry;
  policy: PolicyConfig;
}

/**
 * Agent orchestration — never imports concrete signers.
 * Callers inject signing through API/worker when executing live trades.
 */
export class AgentRuntime {
  private readonly router: Router;
  private readonly policyEngine = new PolicyEngine();

  constructor(private readonly opts: AgentRuntimeOptions) {
    this.router = new Router(opts.registry);
  }

  async quoteAndRoute(intent: ExecutionIntent): Promise<{ best: RoutePlan; alternates: RoutePlan[] }> {
    return this.router.buildPlans(intent);
  }

  evaluatePolicy(intent: ExecutionIntent, route?: RoutePlan): PolicyDecision {
    return this.policyEngine.evaluate({
      intent,
      routePlan: route,
      config: this.opts.policy,
    });
  }

  async runSimulation(
    intent: ExecutionIntent,
    route: RoutePlan
  ): Promise<SimulationResult> {
    return simulate(intent, route, {
      volatility: 0.05,
      latencyMs: 20,
      failureProbability: 0,
      slippageMultiplier: 1,
    });
  }

  /**
   * Type-only signing hook — runtime does not implement signing.
   * Live execution should be performed by infrastructure with a resolved `Signer`.
   */
  async executeLive(_intent: ExecutionIntent, _route: RoutePlan, _signer: Signer): Promise<never> {
    void _intent;
    void _route;
    void _signer;
    throw new Error('Live execution must be invoked from worker/API with injected signer');
  }
}
