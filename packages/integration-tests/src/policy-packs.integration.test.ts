import { afterEach, describe, expect, it } from 'vitest';
import { policyRepo, settingsRepo } from '@keeta-agent-stack/storage';
import { createIntegrationTestRuntime } from './harness.js';
import { shouldRunIntegrationTests } from './support.js';

const integration = shouldRunIntegrationTests() ? describe : describe.skip;

let activeRuntime: Awaited<ReturnType<typeof createIntegrationTestRuntime>> | undefined;

function createPolicyPackRuntime() {
  return createIntegrationTestRuntime({
    envOverrides: {
      AUTH_LEGACY_OPS_API_KEY_ROLE: 'admin',
    },
  });
}

afterEach(async () => {
  await activeRuntime?.close();
  activeRuntime = undefined;
});

integration('policy pack persistence api', () => {
  it('creates, lists, updates, and deletes policy packs', async () => {
    activeRuntime = await createPolicyPackRuntime();

    const createResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/policy/packs',
      headers: activeRuntime.authHeaders(),
      payload: {
        name: 'desk-risk',
        description: 'Desk policy pack',
        rules: [
          {
            ruleId: 'max-slippage',
            priority: 50,
            enabled: true,
            config: { limit: 125 },
          },
        ],
        compositions: [
          {
            ruleId: 'desk-all-of',
            operator: 'allOf',
            children: ['max-slippage'],
            enabled: true,
          },
        ],
      },
    });

    expect(createResponse.statusCode).toBe(201);
    const created = JSON.parse(createResponse.body) as { id: string; name: string };
    expect(created.name).toBe('desk-risk');

    const listResponse = await activeRuntime.app.inject({
      method: 'GET',
      url: '/policy/packs',
      headers: activeRuntime.authHeaders(),
    });
    expect(listResponse.statusCode).toBe(200);
    expect(JSON.parse(listResponse.body)).toEqual(
      expect.arrayContaining([expect.objectContaining({ id: created.id, name: 'desk-risk' })])
    );

    const updateResponse = await activeRuntime.app.inject({
      method: 'PATCH',
      url: `/policy/packs/${created.id}`,
      headers: activeRuntime.authHeaders(),
      payload: {
        name: 'desk-risk-v2',
        description: 'Updated desk policy pack',
      },
    });
    expect(updateResponse.statusCode).toBe(200);
    expect(JSON.parse(updateResponse.body)).toMatchObject({
      id: created.id,
      name: 'desk-risk-v2',
      description: 'Updated desk policy pack',
    });

    const deleteResponse = await activeRuntime.app.inject({
      method: 'DELETE',
      url: `/policy/packs/${created.id}`,
      headers: activeRuntime.authHeaders(),
    });
    expect(deleteResponse.statusCode).toBe(204);

    const missingResponse = await activeRuntime.app.inject({
      method: 'PATCH',
      url: `/policy/packs/${created.id}`,
      headers: activeRuntime.authHeaders(),
      payload: {
        name: 'missing',
      },
    });
    expect(missingResponse.statusCode).toBe(404);
  });

  it('applies a selected policy pack during admin policy preview', async () => {
    activeRuntime = await createPolicyPackRuntime();

    const createResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/policy/packs',
      headers: activeRuntime.authHeaders(),
      payload: {
        name: 'live-override',
        rules: [
          {
            ruleId: 'live_mode_enabled',
            enabled: false,
          },
        ],
        compositions: [],
      },
    });
    expect(createResponse.statusCode).toBe(201);
    const pack = JSON.parse(createResponse.body) as { id: string; name: string };

    const evaluateResponse = await activeRuntime.app.inject({
      method: 'POST',
      url: '/policy/evaluate',
      headers: activeRuntime.authHeaders(),
      payload: {
        reason: 'integration-preview',
        policyPackId: pack.id,
        intent: {
          id: '550e8400-e29b-41d4-a716-446655440401',
          walletId: '550e8400-e29b-41d4-a716-446655440402',
          baseAsset: 'KTA',
          quoteAsset: 'USDC',
          side: 'sell',
          size: '10',
          maxSlippageBps: 25,
          mode: 'live',
          createdAt: new Date().toISOString(),
        },
      },
    });

    expect(evaluateResponse.statusCode).toBe(200);
    expect(JSON.parse(evaluateResponse.body)).toMatchObject({
      decision: {
        allowed: true,
      },
      policyPack: {
        id: pack.id,
        name: 'live-override',
        source: 'request',
      },
    });
  });

  it(
    'applies an intent-selected policy pack during worker policy evaluation',
    async () => {
      activeRuntime = await createPolicyPackRuntime();

      const packResponse = await activeRuntime.app.inject({
        method: 'POST',
        url: '/policy/packs',
        headers: activeRuntime.authHeaders(),
        payload: {
          name: 'live-override',
          rules: [
            {
              ruleId: 'live_mode_enabled',
              enabled: false,
            },
          ],
          compositions: [],
        },
      });
      expect(packResponse.statusCode).toBe(201);
      const pack = JSON.parse(packResponse.body) as { id: string };

      const wallet = await activeRuntime.createWallet({ label: 'Pack Wallet' });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        mode: 'live',
        policyPackId: pack.id,
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.waitForIntentStatus(intent.id, 'policy_checked');

      const decision = await policyRepo.getLatestPolicyDecisionForIntent(activeRuntime.db, intent.id);
      expect(decision).toBeDefined();
      expect(decision?.payload).toMatchObject({
        allowed: true,
        effectivePolicyPackId: pack.id,
        effectivePolicyPackSource: 'intent',
      });

      const auditEvent = await activeRuntime.waitForAuditEvent(intent.id, 'policy.evaluated');
      expect(auditEvent.payload).toMatchObject({
        allowed: true,
        effectivePolicyPackId: pack.id,
        policyPack: {
          id: pack.id,
          source: 'intent',
        },
      });
    },
    30_000
  );

  it(
    'falls back to a wallet default policy pack during worker policy evaluation',
    async () => {
      activeRuntime = await createPolicyPackRuntime();

      const packResponse = await activeRuntime.app.inject({
        method: 'POST',
        url: '/policy/packs',
        headers: activeRuntime.authHeaders(),
        payload: {
          name: 'wallet-default-live-override',
          rules: [{ ruleId: 'live_mode_enabled', enabled: false }],
          compositions: [],
        },
      });
      expect(packResponse.statusCode).toBe(201);
      const pack = JSON.parse(packResponse.body) as { id: string };

      const wallet = await activeRuntime.createWallet({
        label: 'Wallet Default Pack Wallet',
        settings: {
          defaultPolicyPackId: pack.id,
        },
      });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        mode: 'live',
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.waitForIntentStatus(intent.id, 'policy_checked');

      const auditEvent = await activeRuntime.waitForAuditEvent(intent.id, 'policy.evaluated');
      expect(auditEvent.payload).toMatchObject({
        allowed: true,
        effectivePolicyPackId: pack.id,
        policyPack: {
          id: pack.id,
          source: 'wallet_default',
        },
      });
    },
    30_000
  );

  it(
    'falls back to the global default policy pack during worker policy evaluation',
    async () => {
      activeRuntime = await createPolicyPackRuntime();

      const packResponse = await activeRuntime.app.inject({
        method: 'POST',
        url: '/policy/packs',
        headers: activeRuntime.authHeaders(),
        payload: {
          name: 'global-default-live-override',
          rules: [{ ruleId: 'live_mode_enabled', enabled: false }],
          compositions: [],
        },
      });
      expect(packResponse.statusCode).toBe(201);
      const pack = JSON.parse(packResponse.body) as { id: string };
      await settingsRepo.upsertSetting(activeRuntime.db, settingsRepo.POLICY_DEFAULT_PACK_SETTING_KEY, {
        policyPackId: pack.id,
      });

      const wallet = await activeRuntime.createWallet({ label: 'Global Default Pack Wallet' });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        mode: 'live',
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.waitForIntentStatus(intent.id, 'policy_checked');

      const auditEvent = await activeRuntime.waitForAuditEvent(intent.id, 'policy.evaluated');
      expect(auditEvent.payload).toMatchObject({
        allowed: true,
        effectivePolicyPackId: pack.id,
        policyPack: {
          id: pack.id,
          source: 'global_default',
        },
      });
    },
    30_000
  );

  it(
    'applies a strategy-assigned policy pack during worker policy evaluation',
    async () => {
      activeRuntime = await createPolicyPackRuntime();

      const packResponse = await activeRuntime.app.inject({
        method: 'POST',
        url: '/policy/packs',
        headers: activeRuntime.authHeaders(),
        payload: {
          name: 'strategy-live-override',
          rules: [
            {
              ruleId: 'live_mode_enabled',
              enabled: false,
            },
          ],
          compositions: [],
        },
      });
      expect(packResponse.statusCode).toBe(201);
      const pack = JSON.parse(packResponse.body) as { id: string };

      const strategy = await activeRuntime.createStrategy({
        name: 'Policy Strategy',
      });
      const assignResponse = await activeRuntime.app.inject({
        method: 'PUT',
        url: `/ops/strategies/${strategy.id}/policy-pack`,
        headers: activeRuntime.authHeaders(),
        payload: {
          policyPackId: pack.id,
        },
      });
      expect(assignResponse.statusCode).toBe(200);
      expect(JSON.parse(assignResponse.body)).toEqual({
        strategyId: strategy.id,
        policyPackId: pack.id,
      });

      const wallet = await activeRuntime.createWallet({ label: 'Strategy Pack Wallet' });
      const intent = await activeRuntime.createIntent({
        walletId: wallet.id,
        strategyId: strategy.id,
        mode: 'live',
      });

      await activeRuntime.driveIntentPipeline(intent.id, { execute: false });
      await activeRuntime.waitForIntentStatus(intent.id, 'policy_checked');

      const auditEvent = await activeRuntime.waitForAuditEvent(intent.id, 'policy.evaluated');
      expect(auditEvent.payload).toMatchObject({
        allowed: true,
        policyPack: {
          id: pack.id,
          source: 'strategy_config',
        },
      });

      const clearResponse = await activeRuntime.app.inject({
        method: 'DELETE',
        url: `/ops/strategies/${strategy.id}/policy-pack`,
        headers: activeRuntime.authHeaders(),
      });
      expect(clearResponse.statusCode).toBe(200);
      expect(JSON.parse(clearResponse.body)).toEqual({
        strategyId: strategy.id,
        policyPackId: null,
      });
    },
    30_000
  );
});
