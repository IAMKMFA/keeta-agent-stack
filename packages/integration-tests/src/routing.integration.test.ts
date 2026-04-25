import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { MockDexAdapter } from '@keeta-agent-stack/adapter-mock-dex';
import { auditRepo, executionRepo } from '@keeta-agent-stack/storage';
import { RoutePlanSchema } from '@keeta-agent-stack/types';
import { createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests } from './support.js';

const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

function createMultiHopRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(
    new MockDexAdapter({
      id: 'mock-dex-spot',
      spreadBps: 10,
      feeBps: 5,
      maxSlippageBps: 20,
      failureRate: 0,
      seed: 'spot-route',
      supportedPairs: [{ base: 'KTA', quote: 'USDC' }],
    })
  );
  registry.register(
    new MockDexAdapter({
      id: 'mock-dex-fx',
      spreadBps: 8,
      feeBps: 4,
      maxSlippageBps: 15,
      failureRate: 0,
      seed: 'fx-route',
      supportedPairs: [{ base: 'USDC', quote: 'AED' }],
    })
  );
  return registry;
}

describeIntegration('integration routing', () => {
  let runtime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;

  beforeEach(async () => {
    runtime = await createIntegrationTestRuntime({
      registry: createMultiHopRegistry(),
    });
  }, 45_000);

  afterEach(async () => {
    if (runtime) {
      await runtime.close();
      runtime = undefined;
    }
  });

  it('routes and executes a two-hop KTA -> USDC -> AED corridor end to end', async () => {
    if (!runtime) {
      throw new Error('Integration runtime not initialized');
    }
    const wallet = await runtime.createWallet({ label: 'Multi-hop Wallet' });
    const intent = await runtime.createIntent({
      walletId: wallet.id,
      quoteAsset: 'AED',
      size: '250',
    });

    await runtime.driveIntentPipeline(intent.id);

    const routePlan = RoutePlanSchema.parse((await runtime.waitForRoutePlan(intent.id)).payload);
    expect(routePlan.hopCount).toBe(2);
    expect(routePlan.steps).toHaveLength(2);
    expect(routePlan.steps.map((step) => step.adapterId)).toEqual(['mock-dex-spot', 'mock-dex-fx']);
    expect(routePlan.steps.map((step) => `${step.baseAsset}:${step.quoteAsset}`)).toEqual([
      'KTA:USDC',
      'USDC:AED',
    ]);

    const latestExecution = await runtime.waitForLatestExecution(
      intent.id,
      (row) => row?.status === 'confirmed'
    );
    expect(latestExecution?.adapterId).toBe('mock-dex-fx');

    const executionRows = (await executionRepo.listExecutions(runtime.db, 20)).filter(
      (row) => row.intentId === intent.id
    );
    expect(executionRows).toHaveLength(2);
    expect(new Set(executionRows.map((row) => row.adapterId))).toEqual(
      new Set(['mock-dex-spot', 'mock-dex-fx'])
    );

    const auditRows = await auditRepo.listRecentAuditEvents(runtime.db, 50);
    const stepEvents = auditRows.filter(
      (row) => row.intentId === intent.id && row.eventType === 'execution.step_completed'
    );
    expect(stepEvents).toHaveLength(2);

    const completionEvent = await runtime.waitForAuditEvent(intent.id, 'execution.completed');
    expect(completionEvent?.payload).toMatchObject({
      hopCount: 2,
      stepCount: 2,
    });
  });
});
