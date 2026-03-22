import { Worker } from 'bullmq';
import Redis from 'ioredis';
import { loadEnv, QUEUE_NAMES } from '@keeta-agent-sdk/config';
import { createDb } from '@keeta-agent-sdk/storage';
import {
  intentRepo,
  quoteRepo,
  routeRepo,
  policyRepo,
  executionRepo,
  simulationRepo,
  telemetryRepo,
} from '@keeta-agent-sdk/storage';
import { AdapterRegistry, createDefaultDevAdapters } from '@keeta-agent-sdk/adapter-registry';
import { Router } from '@keeta-agent-sdk/routing';
import { PolicyEngine, type PolicyConfig } from '@keeta-agent-sdk/policy';
import { simulate } from '@keeta-agent-sdk/simulator';
import { ExecutionIntentSchema, RoutePlanSchema, SimulationScenarioSchema } from '@keeta-agent-sdk/types';
import { createLogger } from '@keeta-agent-sdk/telemetry';

const log = createLogger('worker');

function defaultPolicy(): PolicyConfig {
  return {
    maxOrderSize: Number(process.env.POLICY_MAX_ORDER_SIZE ?? 1_000_000),
    maxSlippageBps: Number(process.env.POLICY_MAX_SLIPPAGE_BPS ?? 500),
    venueAllowlist: (process.env.POLICY_VENUE_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    assetAllowlist: (process.env.POLICY_ASSET_ALLOWLIST ?? '')
      .split(',')
      .map((s) => s.trim())
      .filter(Boolean),
    liveModeEnabled: process.env.LIVE_MODE_ENABLED === 'true' || process.env.LIVE_MODE_ENABLED === '1',
  };
}

async function main() {
  const env = loadEnv();
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  void redis;
  const db = createDb(env.DATABASE_URL);

  const registry = new AdapterRegistry();
  for (const a of createDefaultDevAdapters()) {
    registry.register(a);
  }

  const router = new Router(registry);
  const policyEngine = new PolicyEngine();
  const policyCfg = defaultPolicy();

  const connection = { connection: { url: env.REDIS_URL } };

  new Worker(
    QUEUE_NAMES.quoteGeneration,
    async (job) => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(row.payload);
      for (const adapter of registry.list()) {
        if (!adapter.supportsPair(intent.baseAsset, intent.quoteAsset)) continue;
        const q = await adapter.getQuote({
          adapterId: adapter.id,
          baseAsset: intent.baseAsset,
          quoteAsset: intent.quoteAsset,
          side: intent.side,
          size: intent.size,
          intentId: intent.id,
        });
        if (q.success) {
          await quoteRepo.insertQuote(db, {
            intentId: intent.id,
            adapterId: adapter.id,
            payload: q.data as unknown as Record<string, unknown>,
          });
        }
      }
      await intentRepo.updateIntentStatus(db, intentId, 'quoted');
    },
    connection
  );

  new Worker(
    QUEUE_NAMES.routeGeneration,
    async (job) => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(row.payload);
      const { best } = await router.buildPlans(intent);
      const plan = RoutePlanSchema.parse(best);
      await routeRepo.insertRoutePlan(db, {
        id: plan.id,
        intentId: intent.id,
        score: plan.score,
        payload: plan as unknown as Record<string, unknown>,
      });
      const steps = plan.steps.map((step) => ({
        planId: plan.id,
        stepIndex: step.stepIndex,
        adapterId: step.adapterId,
        payload: step as unknown as Record<string, unknown>,
      }));
      await routeRepo.insertRouteSteps(db, steps);
      await intentRepo.updateIntentStatus(db, intentId, 'routed');
    },
    connection
  );

  new Worker(
    QUEUE_NAMES.policyEvaluation,
    async (job) => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(row.payload);
      const routeRow = await routeRepo.getRoutePlanForIntent(db, intentId);
      const routePlan = routeRow ? RoutePlanSchema.parse(routeRow.payload) : undefined;
      const decision = policyEngine.evaluate({
        intent,
        routePlan,
        config: policyCfg,
      });
      await policyRepo.insertPolicyDecision(db, {
        intentId: intent.id,
        payload: decision as unknown as Record<string, unknown>,
      });
      await intentRepo.updateIntentStatus(db, intentId, 'policy_checked');
    },
    connection
  );

  new Worker(
    QUEUE_NAMES.executionProcessing,
    async (job) => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(row.payload);
      const routeRow = await routeRepo.getRoutePlanForIntent(db, intentId);
      if (!routeRow) throw new Error('Route not found');
      const plan = RoutePlanSchema.parse(routeRow.payload);
      const first = plan.steps[0];
      if (!first) throw new Error('No route steps');
      const adapter = registry.get(first.adapterId);
      if (!adapter) throw new Error('Adapter missing');
      const mode = intent.mode;
      const res = await adapter.execute({
        intentId: intent.id,
        walletId: intent.walletId,
        mode,
        step: first,
      });
      if (!res.success) {
        await executionRepo.insertExecution(db, {
          intentId: intent.id,
          adapterId: adapter.id,
          status: 'failed',
          payload: res as unknown as Record<string, unknown>,
        });
        await intentRepo.updateIntentStatus(db, intentId, 'failed');
        return;
      }
      await executionRepo.insertExecution(db, {
        intentId: intent.id,
        adapterId: adapter.id,
        status: res.data.status,
        payload: res.data as unknown as Record<string, unknown>,
      });
      await intentRepo.updateIntentStatus(db, intentId, 'executed');
    },
    connection
  );

  new Worker(
    QUEUE_NAMES.simulationRuns,
    async (job) => {
      const { intentId, routePlanId, scenario: rawScenario } = job.data as {
        intentId: string;
        routePlanId: string;
        scenario?: Record<string, unknown>;
      };
      const intentRow = await intentRepo.getIntentById(db, intentId);
      if (!intentRow) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(intentRow.payload);
      const routeRow = await routeRepo.getRoutePlanForIntent(db, intentId);
      if (!routeRow) throw new Error('Route not found');
      const plan = RoutePlanSchema.parse(routeRow.payload);
      if (plan.id !== routePlanId) {
        log.warn({ expected: routePlanId, actual: plan.id }, 'routePlanId mismatch');
      }
      const scenario = SimulationScenarioSchema.parse(rawScenario ?? {});
      const run = await simulationRepo.insertSimulationRun(db, {
        intentId: intent.id,
        routePlanId: plan.id,
        status: 'running',
        scenario: scenario as unknown as Record<string, unknown>,
      });
      const result = await simulate(intent, plan, scenario);
      await simulationRepo.insertSimulationResult(db, {
        runId: run.id,
        payload: result as unknown as Record<string, unknown>,
      });
    },
    connection
  );

  new Worker(
    QUEUE_NAMES.telemetryFlush,
    async (job) => {
      const batch = job.data.batch as { name: string; payload: Record<string, unknown> }[];
      if (!batch?.length) return;
      await telemetryRepo.insertTelemetryBatch(
        db,
        batch.map((b) => ({ name: b.name, payload: b.payload }))
      );
    },
    connection
  );

  log.info('Workers started');
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
