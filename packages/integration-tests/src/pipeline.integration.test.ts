import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { RoutePlanSchema, SimulationResultSchema } from '@keeta-agent-stack/types';
import { computeWebhookSignature, createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests, waitFor } from './support.js';

const describeIntegration = shouldRunIntegrationTests() ? describe : describe.skip;

describeIntegration('integration pipeline', () => {
  let runtime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;

  beforeEach(async () => {
    runtime = await createIntegrationTestRuntime();
  }, 45_000);

  afterEach(async () => {
    if (runtime) {
      await runtime.close();
      runtime = undefined;
    }
  });

  it('drives the quote -> route -> policy -> execute pipeline, exposes events, and signs webhook deliveries', async () => {
    if (!runtime) {
      throw new Error('Integration runtime not initialized');
    }
    const activeRuntime = runtime;
    const webhookSecret = 'super-secret-webhook';
    const webhook = await activeRuntime.createWebhook({
      eventTypes: ['execution.completed'],
      secret: webhookSecret,
    });

    const wallet = await activeRuntime.createWallet();
    const intent = await activeRuntime.createIntent({ walletId: wallet.id });

    await activeRuntime.driveIntentPipeline(intent.id);

    const routePlan = RoutePlanSchema.parse(
      (await activeRuntime.waitForRoutePlan(intent.id)).payload
    );
    expect(routePlan.hopCount).toBe(1);
    expect(routePlan.steps[0]?.adapterId).toBe('mock-dex');

    const execution = await activeRuntime.waitForLatestExecution(
      intent.id,
      (row) => row?.status === 'confirmed'
    );
    expect(execution?.adapterId).toBe('mock-dex');

    const completedEvent = await activeRuntime.waitForAuditEvent(intent.id, 'execution.completed');
    expect(completedEvent?.payload).toMatchObject({
      executionId: execution?.id,
      hopCount: 1,
      stepCount: 1,
    });

    const delivered = await activeRuntime.waitForWebhookDelivery(
      webhook.id,
      (row) => row !== undefined && row.status === 'delivered'
    );
    expect(delivered?.responseStatus).toBe(204);

    const received = await waitFor('execution webhook payload', async () => {
      return (
        activeRuntime.receivedWebhooks.find(
          (entry) =>
            entry.payload?.eventType === 'execution.completed' &&
            entry.payload?.intentId === intent.id
        ) ?? null
      );
    });

    expect(received.payload).toMatchObject({
      source: 'audit',
      eventType: 'execution.completed',
      intentId: intent.id,
      executionId: execution?.id,
    });
    expect(received.headers['x-keeta-signature']).toBe(
      computeWebhookSignature(webhookSecret, received.body)
    );

    const eventsResponse = await activeRuntime.app.inject({
      method: 'GET',
      url: `/events?intentId=${intent.id}&limit=20`,
      headers: { 'x-ops-key': activeRuntime.opsApiKey },
    });
    expect(eventsResponse.statusCode).toBe(200);
    const eventsBody = JSON.parse(eventsResponse.body) as {
      events: Array<{ eventType: string; intentId?: string; executionId?: string }>;
    };
    expect(
      eventsBody.events.some(
        (event) => event.eventType === 'intent.routed' && event.intentId === intent.id
      )
    ).toBe(true);
    expect(
      eventsBody.events.some(
        (event) =>
          event.eventType === 'execution.completed' &&
          event.intentId === intent.id &&
          event.executionId === execution?.id
      )
    ).toBe(true);

    await activeRuntime.pauseWebhook(webhook.id);
  }, 30_000);

  it('runs simulation jobs against a persisted route plan and returns the stored result', async () => {
    if (!runtime) {
      throw new Error('Integration runtime not initialized');
    }
    const activeRuntime = runtime;
    const wallet = await activeRuntime.createWallet({ label: 'Simulation Wallet' });
    const intent = await activeRuntime.createIntent({ walletId: wallet.id });

    await activeRuntime.driveIntentPipeline(intent.id, { execute: false, policy: false });

    const routePlan = await activeRuntime.waitForRoutePlan(intent.id);
    const simulationJob = await activeRuntime.runSimulation({
      intentId: intent.id,
      routePlanId: routePlan.id,
      scenario: {
        volatility: 0.02,
        latencyMs: 15,
        slippageMultiplier: 1.1,
      },
    });
    expect(simulationJob.queue).toBe('simulation-runs');

    const run = await activeRuntime.waitForSimulationRun(
      intent.id,
      routePlan.id,
      (row) => row?.status === 'completed'
    );
    const resultRow = await activeRuntime.waitForSimulationResult(run.id);
    const result = SimulationResultSchema.parse(resultRow?.payload);

    expect(run.status).toBe('completed');
    expect(result.intentId).toBe(intent.id);
    expect(result.routePlanId).toBe(routePlan.id);
    expect(result.success).toBe(true);
    expect(result.simulatedLatencyMs).toBeGreaterThanOrEqual(12);
    expect(result.simulatedLatencyMs).toBeLessThanOrEqual(18);

    const storedResponse = await activeRuntime.app.inject({
      method: 'GET',
      url: `/simulations/${run.id}`,
      headers: activeRuntime.authHeaders('viewer'),
    });
    expect(storedResponse.statusCode).toBe(200);
    const storedBody = JSON.parse(storedResponse.body) as {
      run: { id: string; status: string };
      result: { intentId: string; routePlanId: string; success: boolean };
    };
    expect(storedBody.run.id).toBe(run.id);
    expect(storedBody.result).toMatchObject({
      intentId: intent.id,
      routePlanId: routePlan.id,
      success: true,
    });
  });

  it('retries webhook delivery after a failure and eventually marks the delivery as successful', async () => {
    if (!runtime) {
      throw new Error('Integration runtime not initialized');
    }
    const activeRuntime = runtime;
    activeRuntime.queueWebhookResponse({ statusCode: 500, body: 'temporary failure' });
    activeRuntime.queueWebhookResponse({ statusCode: 204 });

    const webhook = await activeRuntime.createWebhook({
      eventTypes: ['execution.completed'],
    });

    const wallet = await activeRuntime.createWallet({ label: 'Retry Wallet' });
    const intent = await activeRuntime.createIntent({ walletId: wallet.id });

    await activeRuntime.driveIntentPipeline(intent.id);

    const failedAttempt = await activeRuntime.waitForWebhookDelivery(
      webhook.id,
      (row) => row !== undefined && row.status === 'failed' && row.attemptCount === 1,
      15_000
    );
    expect(failedAttempt?.responseStatus).toBe(500);
    expect(failedAttempt?.lastError).toBe('Webhook returned 500');

    const delivered = await activeRuntime.waitForWebhookDelivery(
      webhook.id,
      (row) => row !== undefined && row.status === 'delivered' && row.attemptCount >= 2,
      20_000
    );
    expect(delivered?.attemptCount).toBe(2);
    expect(delivered?.responseStatus).toBe(204);

    const matchingWebhooks = await waitFor(
      'webhook receiver to observe both attempts',
      async () => {
        const rows = activeRuntime.receivedWebhooks.filter(
          (entry) =>
            entry.payload?.eventType === 'execution.completed' &&
            entry.payload?.intentId === intent.id
        );
        return rows.length >= 2 ? rows : null;
      }
    );
    expect(matchingWebhooks).toHaveLength(2);

    await activeRuntime.pauseWebhook(webhook.id);
  }, 30_000);
});
