import { createHmac, randomUUID } from 'node:crypto';
import { createServer, type IncomingHttpHeaders, type Server } from 'node:http';
import { SignJWT } from 'jose';
import type { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import {
  auditRepo,
  createDb,
  executionRepo,
  intentRepo,
  routeRepo,
  simulationRepo,
  webhookRepo,
} from '@keeta-agent-sdk/storage';
import type { ExecutionIntent, IntentPipelineState } from '@keeta-agent-sdk/types';
import { buildApiApp } from '../../../apps/api/src/server.js';
import { runWorkerApp } from '../../../apps/worker/src/index.js';
import {
  applyIntegrationEnv,
  createIsolatedDatabase,
  getIntegrationRuntimeConfig,
  prepareRedis,
  waitFor,
} from './support.js';

type JsonRecord = Record<string, unknown>;
type IntentRow = NonNullable<Awaited<ReturnType<typeof intentRepo.getIntentById>>>;
type LatestExecutionRow = NonNullable<Awaited<ReturnType<typeof executionRepo.getLatestExecutionForIntent>>>;
type SimulationRunRow = Awaited<ReturnType<typeof simulationRepo.listSimulationRuns>>[number];
type SimulationResultRow = NonNullable<Awaited<ReturnType<typeof simulationRepo.getSimulationResultByRun>>>;
type AuditEventRow = NonNullable<Awaited<ReturnType<typeof auditRepo.getAuditEventById>>>;
type WebhookDeliveryRow = Awaited<ReturnType<typeof webhookRepo.listWebhookDeliveries>>[number];

export interface ReceivedWebhook {
  headers: IncomingHttpHeaders;
  body: string;
  payload: JsonRecord | null;
}

export interface WebhookResponsePlan {
  statusCode: number;
  body?: string;
  headers?: Record<string, string>;
}

export interface IntegrationTestRuntimeOptions {
  envOverrides?: Record<string, string | undefined>;
  registry?: AdapterRegistry;
}

export type IntegrationAuthRole = 'viewer' | 'operator' | 'admin';

function resolveOverride(
  overrides: Record<string, string | undefined> | undefined,
  key: string,
  fallback: string | undefined
): string | undefined {
  return Object.prototype.hasOwnProperty.call(overrides ?? {}, key) ? overrides?.[key] : fallback;
}

export interface CreateWalletInput {
  label?: string;
  address?: string;
}

export interface CreateIntentInput {
  walletId: string;
  baseAsset?: string;
  quoteAsset?: string;
  side?: 'buy' | 'sell';
  size?: string;
  maxSlippageBps?: number;
  mode?: 'simulate' | 'live';
  strategyId?: string;
  venueAllowlist?: string[];
  metadata?: JsonRecord;
  requiresApproval?: boolean;
}

export interface SimulationScenarioInput {
  fidelityMode?: 'standard' | 'shadow' | 'replay';
  volatility?: number;
  latencyMs?: number;
  failureProbability?: number;
  slippageMultiplier?: number;
  replayAnchor?: string;
}

function safeParseJson(value: string): JsonRecord | null {
  try {
    return JSON.parse(value) as JsonRecord;
  } catch {
    return null;
  }
}

function parseJson<T>(value: string): T {
  return JSON.parse(value) as T;
}

function assertStatus(statusCode: number, expected: number, body: string) {
  if (statusCode !== expected) {
    throw new Error(`Expected status ${expected}, received ${statusCode}: ${body}`);
  }
}

export function computeWebhookSignature(secret: string, body: string): string {
  return createHmac('sha256', secret).update(body).digest('hex');
}

export async function createIntegrationTestRuntime(
  options: IntegrationTestRuntimeOptions = {}
): Promise<{
  app: Awaited<ReturnType<typeof buildApiApp>>;
  db: ReturnType<typeof createDb>;
  opsApiKey: string;
  adminToken: string;
  authHeaders: (role?: IntegrationAuthRole) => Record<string, string>;
  issueJwt: (role?: IntegrationAuthRole) => Promise<string>;
  webhookTargetUrl: string;
  receivedWebhooks: ReceivedWebhook[];
  queueWebhookResponse: (plan: WebhookResponsePlan) => void;
  resetWebhookReceiver: () => void;
  createWebhook: (input?: { eventTypes?: string[]; secret?: string; targetUrl?: string }) => Promise<{
    id: string;
    targetUrl: string;
    eventTypes: string[];
    secretPresent: boolean;
  }>;
  pauseWebhook: (id: string) => Promise<void>;
  createWallet: (input?: CreateWalletInput) => Promise<{ id: string }>;
  createIntent: (input: CreateIntentInput) => Promise<ExecutionIntent>;
  queueIntentStep: (intentId: string, step: 'quote' | 'route' | 'policy' | 'execute') => Promise<void>;
  driveIntentPipeline: (
    intentId: string,
    options?: { quote?: boolean; route?: boolean; policy?: boolean; execute?: boolean }
  ) => Promise<void>;
  waitForIntentStatus: (intentId: string, status: IntentPipelineState) => Promise<IntentRow>;
  waitForRoutePlan: (intentId: string) => Promise<{ id: string; payload: JsonRecord }>;
  waitForLatestExecution: (
    intentId: string,
    predicate?: (row: LatestExecutionRow) => boolean
  ) => Promise<LatestExecutionRow>;
  waitForSimulationRun: (
    intentId: string,
    routePlanId: string,
    predicate?: (row: SimulationRunRow) => boolean
  ) => Promise<SimulationRunRow>;
  waitForSimulationResult: (runId: string) => Promise<SimulationResultRow>;
  waitForAuditEvent: (intentId: string, eventType: string) => Promise<AuditEventRow>;
  waitForWebhookDelivery: (
    subscriptionId: string,
    predicate?: (row: WebhookDeliveryRow) => boolean,
    timeoutMs?: number
  ) => Promise<WebhookDeliveryRow>;
  runSimulation: (
    input: { intentId: string; routePlanId: string; scenario?: SimulationScenarioInput }
  ) => Promise<{ jobId: string; queue: string }>;
  close: () => Promise<void>;
}> {
  const runtime = getIntegrationRuntimeConfig();
  const isolatedDatabase = await createIsolatedDatabase(runtime);
  const cleanupRedis = await prepareRedis(runtime.redisUrl);
  const adminToken = 'integration-admin-token';
  const jwtSecret = resolveOverride(options.envOverrides, 'AUTH_JWT_SECRET', process.env.AUTH_JWT_SECRET);
  const opsApiKey = resolveOverride(options.envOverrides, 'OPS_API_KEY', runtime.opsApiKey);
  const restoreEnv = applyIntegrationEnv({
    NODE_ENV: 'test',
    DATABASE_URL: isolatedDatabase.databaseUrl,
    REDIS_URL: runtime.redisUrl,
    OPS_API_KEY: runtime.opsApiKey,
    ADMIN_BYPASS_TOKEN: adminToken,
    LIVE_MODE_ENABLED: 'false',
    ALLOW_DEV_SIGNER: 'false',
    KEETA_NETWORK: 'test',
    WEBHOOK_DELIVERY_INTERVAL_MS: '1000',
    ANCHOR_BOND_RECONCILE_INTERVAL_MS: '600000',
    RECONCILE_INTERVAL_MS: '600000',
    METRICS_INTERVAL_MS: '600000',
    STUCK_JOB_SWEEP_INTERVAL_MS: '600000',
    OPERATOR_METRICS_INTERVAL_MS: '600000',
    OPERATOR_METRICS_TTL_MS: '600000',
    ...options.envOverrides,
  });

  const db = createDb(isolatedDatabase.databaseUrl);
  const workerShutdown = await runWorkerApp({ registry: options.registry });
  const app = await buildApiApp({ registry: options.registry });

  const receivedWebhooks: ReceivedWebhook[] = [];
  const webhookResponses: WebhookResponsePlan[] = [];
  const webhookServer: Server = createServer(async (req, res) => {
    const chunks: Buffer[] = [];
    for await (const chunk of req) {
      chunks.push(Buffer.isBuffer(chunk) ? chunk : Buffer.from(chunk));
    }

    const body = Buffer.concat(chunks).toString('utf8');
    receivedWebhooks.push({
      headers: req.headers,
      body,
      payload: safeParseJson(body),
    });

    const responsePlan = webhookResponses.shift() ?? { statusCode: 204 };
    if (responsePlan.headers) {
      for (const [header, value] of Object.entries(responsePlan.headers)) {
        res.setHeader(header, value);
      }
    }
    res.statusCode = responsePlan.statusCode;
    res.end(responsePlan.body ?? '');
  });

  await new Promise<void>((resolve, reject) => {
    webhookServer.listen(0, '127.0.0.1', () => resolve());
    webhookServer.once('error', reject);
  });

  const address = webhookServer.address();
  if (!address || typeof address === 'string') {
    throw new Error('Webhook server did not expose a TCP port');
  }
  const webhookTargetUrl = `http://127.0.0.1:${address.port}/events`;

  return {
    app,
    db,
    opsApiKey: runtime.opsApiKey,
    adminToken,
    authHeaders: (role: IntegrationAuthRole = 'operator') => {
      if (opsApiKey) {
        const headers: Record<string, string> = { 'x-ops-key': opsApiKey };
        return headers;
      }
      if (jwtSecret) {
        throw new Error('Use issueJwt() for async JWT auth header generation');
      }
      if (role === 'admin') {
        const headers: Record<string, string> = { 'x-admin-token': adminToken };
        return headers;
      }
      throw new Error('No integration auth mechanism is configured');
    },
    issueJwt: async (role = 'operator') => {
      if (!jwtSecret) {
        throw new Error('AUTH_JWT_SECRET is not configured for this integration runtime');
      }
      return new SignJWT({ roles: [role] })
        .setProtectedHeader({ alg: 'HS256' })
        .setSubject(`integration-${role}`)
        .setIssuer('integration-tests')
        .setAudience('keeta-agent-sdk')
        .setIssuedAt()
        .setExpirationTime('5m')
        .sign(new TextEncoder().encode(jwtSecret));
    },
    webhookTargetUrl,
    receivedWebhooks,
    queueWebhookResponse: (plan) => {
      webhookResponses.push(plan);
    },
    resetWebhookReceiver: () => {
      webhookResponses.length = 0;
      receivedWebhooks.length = 0;
    },
    createWebhook: async (input = {}) => {
      const response = await app.inject({
        method: 'POST',
        url: '/ops/webhooks',
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        payload: {
          targetUrl: input.targetUrl ?? webhookTargetUrl,
          eventTypes: input.eventTypes ?? ['execution.completed'],
          ...(input.secret ? { secret: input.secret } : {}),
        },
      });
      assertStatus(response.statusCode, 201, response.body);
      return parseJson<{ webhook: { id: string; targetUrl: string; eventTypes: string[]; secretPresent: boolean } }>(
        response.body
      ).webhook;
    },
    pauseWebhook: async (id) => {
      const response = await app.inject({
        method: 'PATCH',
        url: `/ops/webhooks/${id}`,
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        payload: { status: 'paused' },
      });
      assertStatus(response.statusCode, 200, response.body);
    },
    createWallet: async (input = {}) => {
      const response = await app.inject({
        method: 'POST',
        url: '/wallets/import',
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        payload: {
          label: input.label ?? 'Integration Wallet',
          address: input.address ?? `keeta_${randomUUID().replace(/-/g, '')}`,
        },
      });
      assertStatus(response.statusCode, 201, response.body);
      return parseJson<{ id: string }>(response.body);
    },
    createIntent: async (input) => {
      const response = await app.inject({
        method: 'POST',
        url: '/intents',
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        payload: {
          walletId: input.walletId,
          baseAsset: input.baseAsset ?? 'KTA',
          quoteAsset: input.quoteAsset ?? 'USDC',
          side: input.side ?? 'sell',
          size: input.size ?? '100',
          maxSlippageBps: input.maxSlippageBps ?? 50,
          mode: input.mode ?? 'simulate',
          ...(input.strategyId ? { strategyId: input.strategyId } : {}),
          ...(input.venueAllowlist ? { venueAllowlist: input.venueAllowlist } : {}),
          ...(input.metadata ? { metadata: input.metadata } : {}),
          ...(input.requiresApproval !== undefined ? { requiresApproval: input.requiresApproval } : {}),
        },
      });
      assertStatus(response.statusCode, 201, response.body);
      return parseJson<ExecutionIntent>(response.body);
    },
    queueIntentStep: async (intentId, step) => {
      const response = await app.inject({
        method: 'POST',
        url: `/intents/${intentId}/${step}`,
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
      });
      assertStatus(response.statusCode, 202, response.body);
    },
    driveIntentPipeline: async (intentId, stepOptions = {}) => {
      const shouldQuote = stepOptions.quote !== false;
      const shouldRoute = stepOptions.route !== false;
      const shouldPolicy = stepOptions.policy !== false;
      const shouldExecute = stepOptions.execute !== false;

      if (shouldQuote) {
        const response = await app.inject({
          method: 'POST',
          url: `/intents/${intentId}/quote`,
          headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        });
        assertStatus(response.statusCode, 202, response.body);
        await waitFor('intent to be quoted', async () => {
          const row = await intentRepo.getIntentById(db, intentId);
          return row?.status === 'quoted' ? row : null;
        });
      }

      if (shouldRoute) {
        const response = await app.inject({
          method: 'POST',
          url: `/intents/${intentId}/route`,
          headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        });
        assertStatus(response.statusCode, 202, response.body);
        await waitFor('intent to be routed', async () => {
          const row = await intentRepo.getIntentById(db, intentId);
          return row?.status === 'routed' ? row : null;
        });
      }

      if (shouldPolicy) {
        const response = await app.inject({
          method: 'POST',
          url: `/intents/${intentId}/policy`,
          headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        });
        assertStatus(response.statusCode, 202, response.body);
        await waitFor('intent to be policy checked', async () => {
          const row = await intentRepo.getIntentById(db, intentId);
          return row?.status === 'policy_checked' ? row : null;
        });
      }

      if (shouldExecute) {
        const response = await app.inject({
          method: 'POST',
          url: `/intents/${intentId}/execute`,
          headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        });
        assertStatus(response.statusCode, 202, response.body);
        await waitFor('intent to be executed', async () => {
          const row = await intentRepo.getIntentById(db, intentId);
          return row?.status === 'executed' ? row : null;
        });
      }
    },
    waitForIntentStatus: async (intentId, status) =>
      waitFor(`intent ${intentId} to reach ${status}`, async () => {
        const row = await intentRepo.getIntentById(db, intentId);
        return row?.status === status ? row : null;
      }),
    waitForRoutePlan: async (intentId) =>
      waitFor(`route plan for intent ${intentId}`, async () => {
        const row = await routeRepo.getRoutePlanForIntent(db, intentId);
        return row ? { id: row.id, payload: row.payload as JsonRecord } : null;
      }),
    waitForLatestExecution: async (intentId, predicate = () => true) =>
      waitFor(`execution for intent ${intentId}`, async () => {
        const row = await executionRepo.getLatestExecutionForIntent(db, intentId);
        return row && predicate(row) ? row : null;
      }),
    waitForSimulationRun: async (intentId, routePlanId, predicate = () => true) =>
      waitFor(`simulation run for intent ${intentId}`, async () => {
        const rows = await simulationRepo.listSimulationRuns(db, 50);
        const row = rows.find((candidate) => candidate.intentId === intentId && candidate.routePlanId === routePlanId);
        return row && predicate(row) ? row : null;
      }),
    waitForSimulationResult: async (runId) =>
      waitFor(`simulation result for run ${runId}`, async () => {
        const row = await simulationRepo.getSimulationResultByRun(db, runId);
        return row ?? null;
      }),
    waitForAuditEvent: async (intentId, eventType) =>
      waitFor(`${eventType} audit event`, async () => {
        const rows = await auditRepo.listRecentAuditEvents(db, 100);
        return rows.find((row) => row.intentId === intentId && row.eventType === eventType) ?? null;
      }),
    waitForWebhookDelivery: async (subscriptionId, predicate = () => true, timeoutMs = 20_000) =>
      waitFor(
        `webhook delivery for subscription ${subscriptionId}`,
        async () => {
          const rows = await webhookRepo.listWebhookDeliveries(db, { subscriptionId, limit: 50 });
          const row = rows.find((candidate) => predicate(candidate));
          return row ?? null;
        },
        { timeoutMs }
      ),
    runSimulation: async ({ intentId, routePlanId, scenario }) => {
      const response = await app.inject({
        method: 'POST',
        url: '/simulations/run',
        headers: opsApiKey ? { 'x-ops-key': opsApiKey } : undefined,
        payload: {
          intentId,
          routePlanId,
          ...(scenario ? { scenario } : {}),
        },
      });
      assertStatus(response.statusCode, 202, response.body);
      return parseJson<{ jobId: string; queue: string }>(response.body);
    },
    close: async () => {
      await workerShutdown();
      await app.close();
      await db.pool.end();
      await new Promise<void>((resolve, reject) => webhookServer.close((error) => (error ? reject(error) : resolve())));
      await cleanupRedis();
      await isolatedDatabase.cleanup();
      restoreEnv();
    },
  };
}
