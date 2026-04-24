import { afterEach, describe, expect, it } from 'vitest';
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { MockDexAdapter } from '@keeta-agent-stack/adapter-mock-dex';
import { createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests } from './support.js';

const integration = shouldRunIntegrationTests() ? describe : describe.skip;

class ExecuteFailureDexAdapter extends MockDexAdapter {
  override async execute() {
    return {
      success: false as const,
      code: 'SIMULATED_FAILURE',
      message: 'Injected execution failure',
    };
  }
}

function createExecutionFailureRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  registry.register(
    new ExecuteFailureDexAdapter({
      id: 'mock-dex-failing-exec',
      spreadBps: 10,
      feeBps: 5,
      maxSlippageBps: 20,
      failureRate: 0,
      seed: 'failing-exec-route',
      supportedPairs: [{ base: 'KTA', quote: 'USDC' }],
    })
  );
  return registry;
}

let activeRuntime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;

afterEach(async () => {
  await activeRuntime?.close();
  activeRuntime = undefined;
});

integration('integration error paths', () => {
  it('fails closed on ops routes when the OPS key is not configured', async () => {
    activeRuntime = await createIntegrationTestRuntime({
      envOverrides: {
        OPS_API_KEY: undefined,
      },
    });

    const response = await activeRuntime.app.inject({
      method: 'GET',
      url: '/ops/metrics',
    });

    expect(response.statusCode).toBe(401);
    expect(JSON.parse(response.body)).toMatchObject({
      error: {
        code: 'UNAUTHORIZED',
        message: 'Authentication required',
      },
    });
  });

  it(
    'marks live execution as failed when the kill switch is active',
    async () => {
      activeRuntime = await createIntegrationTestRuntime({
        envOverrides: {
          LIVE_MODE_ENABLED: 'true',
          EXECUTION_KILL_SWITCH: 'true',
        },
      });

      const wallet = await activeRuntime.createWallet({ label: 'Kill Switch Wallet' });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        mode: 'live',
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.queueIntentStep(intent.id, 'execute');

      const failedIntent = await activeRuntime.waitForIntentStatus(intent.id, 'failed');
      expect(failedIntent.status).toBe('failed');

      const failedEvent = await activeRuntime.waitForAuditEvent(intent.id, 'execution.job_failed');
      expect(failedEvent.payload).toMatchObject({
        queueName: 'execution-processing',
      });
      expect(failedEvent.payload.error).toContain('kill switch');
    },
    30_000
  );

  it(
    'blocks execution when the latest policy decision is disallowed',
    async () => {
      activeRuntime = await createIntegrationTestRuntime({
        envOverrides: {
          LIVE_MODE_ENABLED: 'false',
        },
      });

      const wallet = await activeRuntime.createWallet({ label: 'Policy Block Wallet' });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        mode: 'live',
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });

      const blockedEvent = await activeRuntime.waitForAuditEvent(intent.id, 'policy.blocked');
      expect(typeof blockedEvent.payload.summary).toBe('string');
      expect(blockedEvent.payload.failedRuleIds).toContain('live_mode_enabled');

      await activeRuntime.queueIntentStep(intent.id, 'execute');

      const failedIntent = await activeRuntime.waitForIntentStatus(intent.id, 'failed');
      expect(failedIntent.status).toBe('failed');

      const failedEvent = await activeRuntime.waitForAuditEvent(intent.id, 'execution.job_failed');
      expect(failedEvent.payload.error).toContain('Policy blocked execution');
    },
    30_000
  );

  it(
    'caps webhook retries and leaves permanently failing deliveries in a terminal failed state',
    async () => {
      activeRuntime = await createIntegrationTestRuntime({
        envOverrides: {
          WEBHOOK_DELIVERY_MAX_ATTEMPTS: '2',
        },
      });

      activeRuntime.queueWebhookResponse({ statusCode: 500, body: 'first failure' });
      activeRuntime.queueWebhookResponse({ statusCode: 500, body: 'second failure' });
      activeRuntime.queueWebhookResponse({ statusCode: 500, body: 'should never be used' });

      const webhook = await activeRuntime.createWebhook({
        eventTypes: ['execution.completed'],
      });

      const wallet = await activeRuntime.createWallet({ label: 'Webhook Exhaustion Wallet' });
      const intent = await activeRuntime.createIntent({ walletId: wallet.id });

      await activeRuntime.driveIntentPipeline(intent.id);

      const failedDelivery = await activeRuntime.waitForWebhookDelivery(
        webhook.id,
        (row) =>
          row !== undefined &&
          row.status === 'failed' &&
          row.attemptCount === 2 &&
          row.nextAttemptAt === null,
        20_000
      );
      expect(failedDelivery.lastError).toContain('max attempts reached');
      expect(failedDelivery.responseStatus).toBe(500);

      await new Promise((resolve) => setTimeout(resolve, 3_500));
      const matchingAttempts = activeRuntime.receivedWebhooks.filter(
        (entry) => entry.payload?.eventType === 'execution.completed' && entry.payload?.intentId === intent.id
      );
      expect(matchingAttempts).toHaveLength(2);
    },
    30_000
  );

  it(
    'marks the intent failed when an adapter returns an execution error',
    async () => {
      activeRuntime = await createIntegrationTestRuntime({
        registry: createExecutionFailureRegistry(),
      });

      const wallet = await activeRuntime.createWallet({ label: 'Execution Failure Wallet' });
      const intent = await activeRuntime.createIntent({ walletId: wallet.id });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.queueIntentStep(intent.id, 'execute');

      const failedIntent = await activeRuntime.waitForIntentStatus(intent.id, 'failed');
      expect(failedIntent.status).toBe('failed');

      const failedExecution = await activeRuntime.waitForLatestExecution(
        intent.id,
        (row) => row !== undefined && row.status === 'failed'
      );
      expect(failedExecution.adapterId).toBe('mock-dex-failing-exec');

      const failedAuditEvent = await activeRuntime.waitForAuditEvent(intent.id, 'execution.failed');
      expect(failedAuditEvent.payload).toMatchObject({
        adapterId: 'mock-dex-failing-exec',
        code: 'SIMULATED_FAILURE',
      });
    },
    30_000
  );
});
