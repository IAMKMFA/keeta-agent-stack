import type { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import {
  PolicyEngine,
  type PolicyConfig,
  type PolicyEvaluationOverrides,
  type PolicyRuleDefinition,
  type PolicyRuleMetadata,
} from '@keeta-agent-stack/policy';
import { Router } from '@keeta-agent-stack/routing';
import { simulate } from '@keeta-agent-stack/simulator';
import {
  SimulationScenarioSchema,
  type ExecutionIntent,
  type PolicyDecision,
  type RoutePlan,
  type SimulationResult,
  type SimulationScenario,
} from '@keeta-agent-stack/types';
import type { Signer } from '@keeta-agent-stack/wallet';

export interface AgentRuntimeHookContext {
  intent: ExecutionIntent;
  route?: RoutePlan;
  routes?: {
    best: RoutePlan;
    alternates: RoutePlan[];
  };
  policyDecision?: PolicyDecision;
  simulationResult?: SimulationResult;
  metadata: Record<string, unknown>;
}

export type AgentRuntimeHook = (ctx: AgentRuntimeHookContext) => void | Promise<void>;

export interface AgentRuntimeHooks {
  beforeQuote?: AgentRuntimeHook;
  afterRoute?: AgentRuntimeHook;
  beforePolicy?: AgentRuntimeHook;
  afterPolicy?: AgentRuntimeHook;
  beforeSimulation?: AgentRuntimeHook;
  afterSimulation?: AgentRuntimeHook;
  beforeExecute?: AgentRuntimeHook;
  afterExecute?: AgentRuntimeHook;
}

export interface AgentRuntimeOptions {
  registry: AdapterRegistry;
  policy: PolicyConfig;
  policyRules?: PolicyRuleDefinition[];
  hooks?: AgentRuntimeHooks;
  simulationScenario?: SimulationScenario;
}

export type AgentRuntimePolicyEvaluationOptions = PolicyEvaluationOverrides;

const DEFAULT_RUNTIME_SIMULATION_SCENARIO = SimulationScenarioSchema.parse({
  fidelityMode: 'standard',
  volatility: 0.05,
  latencyMs: 20,
  failureProbability: 0,
  slippageMultiplier: 1,
});

/**
 * Agent orchestration — never imports concrete signers.
 * Callers inject signing through API/worker when executing live trades.
 */
export class AgentRuntime {
  private readonly router: Router;
  private readonly policyEngine: PolicyEngine;
  private readonly hooks: AgentRuntimeHooks;
  private readonly simulationScenario: SimulationScenario;

  constructor(private readonly opts: AgentRuntimeOptions) {
    this.router = new Router(opts.registry);
    this.policyEngine = new PolicyEngine({ rules: opts.policyRules });
    this.hooks = opts.hooks ?? {};
    this.simulationScenario = SimulationScenarioSchema.parse(
      opts.simulationScenario ?? DEFAULT_RUNTIME_SIMULATION_SCENARIO
    );
  }

  private async runHook(
    hook: AgentRuntimeHook | undefined,
    ctx: AgentRuntimeHookContext
  ): Promise<void> {
    if (!hook) return;
    await hook(ctx);
  }

  private runHookSync(hook: AgentRuntimeHook | undefined, ctx: AgentRuntimeHookContext): void {
    if (!hook) return;
    const result = hook(ctx);
    if (result && typeof (result as { then?: unknown }).then === 'function') {
      throw new Error('Async hooks are not supported for synchronous policy evaluation');
    }
  }

  private createHookContext(intent: ExecutionIntent): AgentRuntimeHookContext {
    return {
      intent,
      metadata: {},
    };
  }

  async quoteAndRoute(
    intent: ExecutionIntent
  ): Promise<{ best: RoutePlan; alternates: RoutePlan[] }> {
    const ctx = this.createHookContext(intent);
    await this.runHook(this.hooks.beforeQuote, ctx);
    const builtRoutes = await this.router.buildPlans(ctx.intent);
    ctx.routes = builtRoutes;
    await this.runHook(this.hooks.afterRoute, ctx);
    if (!ctx.routes) {
      throw new Error('Route pipeline hook removed routing output');
    }
    if (ctx.routes.best.steps.length === 0) {
      throw new Error('Route pipeline hook produced empty best plan');
    }
    return ctx.routes;
  }

  describePolicyRules(): PolicyRuleMetadata[] {
    return this.policyEngine.listRuleMetadata();
  }

  evaluatePolicy(
    intent: ExecutionIntent,
    route?: RoutePlan,
    options: AgentRuntimePolicyEvaluationOptions = {}
  ): PolicyDecision {
    const ctx = this.createHookContext(intent);
    if (route) {
      ctx.route = route;
    }
    this.runHookSync(this.hooks.beforePolicy, ctx);

    const decision = this.policyEngine.evaluate({
      intent: ctx.intent,
      routePlan: ctx.route,
      config: this.opts.policy,
      keetaHints: options.keetaHints,
      anchorBonds: options.anchorBonds,
      portfolioStats: options.portfolioStats,
      identityHints: options.identityHints,
      customRuleConfig: options.customRuleConfig,
    });
    ctx.policyDecision = decision;
    this.runHookSync(this.hooks.afterPolicy, ctx);
    return decision;
  }

  async runSimulation(intent: ExecutionIntent, route: RoutePlan): Promise<SimulationResult> {
    const ctx = this.createHookContext(intent);
    ctx.route = route;
    await this.runHook(this.hooks.beforeSimulation, ctx);
    const result = await simulate(intent, ctx.route, this.simulationScenario);
    ctx.simulationResult = result;
    await this.runHook(this.hooks.afterSimulation, ctx);
    return result;
  }

  /**
   * Type-only signing hook — runtime does not implement signing.
   * Live execution should be performed by infrastructure with a resolved `Signer`.
   */
  async executeLive(_intent: ExecutionIntent, _route: RoutePlan, _signer: Signer): Promise<never> {
    const ctx = this.createHookContext(_intent);
    ctx.route = _route;
    await this.runHook(this.hooks.beforeExecute, ctx);
    try {
      void _intent;
      void _route;
      void _signer;
      throw new Error('Live execution must be invoked from worker/API with injected signer');
    } finally {
      await this.runHook(this.hooks.afterExecute, ctx);
    }
  }
}
