import { Queue, UnrecoverableError, Worker } from 'bullmq';
import { Redis } from 'ioredis';
import { createHash, createHmac } from 'node:crypto';
import {
  loadEnv,
  QUEUE_NAMES,
  getWorkerOptions,
  type AppEnv,
} from '@keeta-agent-sdk/config';
import { createDb, type Database } from '@keeta-agent-sdk/storage';
import {
  intentRepo,
  quoteRepo,
  routeRepo,
  policyRepo,
  executionRepo,
  simulationRepo,
  telemetryRepo,
  walletRepo,
  auditRepo,
  metricsRepo,
  jobFailureRepo,
  settingsRepo,
  snapshotRepo,
  strategyRepo,
  routeOverrideRepo,
  portfolioRepo,
  paymentAnchorRepo,
  journalRepo,
  operatorMetricsRepo,
  webhookRepo,
} from '@keeta-agent-sdk/storage';
import { createDefaultDevRegistry, type AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import { Router } from '@keeta-agent-sdk/routing';
import {
  applyPolicyPack,
  defaultPolicyConfigFromEnv,
  PolicyEngine,
  resolvePolicyPackSelection as resolveStoredPolicyPackSelection,
  type PolicyAnchorBondHint,
  type PolicyConfig,
  type PolicyIdentityHints,
  type PolicyKeetaHints,
  type PolicyPack,
  type PolicyPortfolioStats,
} from '@keeta-agent-sdk/policy';
import { simulate } from '@keeta-agent-sdk/simulator';
import {
  type AnchorBondRecord,
  AnchorBondStatusSchema,
  AnchorWithdrawalDelayDaysSchema,
  type AnchorBondStatus,
  canTransitionPaymentAnchorStatus,
  ExecutionIntentSchema,
  evaluatePaymentAnchorOnboarding,
  evaluatePaymentAnchorReadiness,
  type PaymentAnchorStatus,
  PaymentAnchorStatusSchema,
  RoutePlanSchema,
  SimulationScenarioSchema,
  canTransitionIntentStatus,
  NormalizedReceiptSchema,
  type ExecutionIntent,
  type ExecutionResult,
  type KeetaSimulationSnapshot,
  type PolicyDecision,
  PolicyDecisionSchema,
  type PolicyPackSource,
  type RouteScoreAdjustment,
  type RouteStepRoutingContext,
  type SimulationScenario,
  type IntentPipelineState,
} from '@keeta-agent-sdk/types';
import {
  createLogger,
  initTracing,
  readTraceMetadata,
  shutdownTracing,
  withLogContext,
  withSpan,
  type TelemetryAttributes,
} from '@keeta-agent-sdk/telemetry';
import {
  OperatorMetricsCache,
  fetchOperatorMetrics,
  buildDynamicScoreAdjustments,
} from './operator-metrics-cache.js';
import {
  AccountManager,
  createAnchorBondVerifier,
  getBalances,
  KEETA_USER_CLIENT_EXTENSION,
  readChainHealth,
  createSigningUserClient,
  type UserClient,
} from '@keeta-agent-sdk/keeta';

const log = createLogger('worker');
const WEBHOOK_EVENT_CURSOR_KEY = 'webhook_event_delivery_cursor';

let signingUserClient: UserClient | null | undefined;

export interface WorkerAppOptions {
  env?: AppEnv;
  registry?: AdapterRegistry;
}

function createSigningGetter(env: AppEnv) {
  return function getSigningUserClient(): UserClient | null {
    if (!env.LIVE_MODE_ENABLED || !env.KEETA_SIGNING_SEED) {
      return null;
    }
    if (signingUserClient === undefined) {
      try {
        signingUserClient = createSigningUserClient(env);
        log.info('Keeta signing UserClient initialized for live execution');
      } catch (e) {
        log.error({ err: e }, 'Failed to create Keeta signing UserClient');
        signingUserClient = null;
      }
    }
    return signingUserClient;
  };
}

function executionToRow(
  intentId: string,
  adapterId: string,
  data: ExecutionResult
): {
  intentId: string;
  adapterId: string;
  status: string;
  payload: Record<string, unknown>;
  txHash?: string | null;
  blockHeight?: string | null;
  settlementState?: string | null;
  receipt?: Record<string, unknown> | null;
  lifecycleState?: string | null;
  normalizedReceipt?: Record<string, unknown> | null;
} {
  const raw = data.raw;
  let receipt: Record<string, unknown> | null = null;
  if (raw && typeof raw === 'object' && 'receipt' in raw && raw.receipt && typeof raw.receipt === 'object') {
    receipt = raw.receipt as Record<string, unknown>;
  } else if (raw && typeof raw === 'object') {
    receipt = raw as Record<string, unknown>;
  }
  const lifecycleState =
    data.status === 'failed'
      ? 'failed'
      : data.settlementState === 'confirmed'
      ? 'confirmed'
      : data.settlementState === 'failed'
        ? 'failed'
        : data.settlementState === 'submitted'
          ? 'submitted'
          : data.status === 'pending'
            ? 'pending'
            : 'unknown';
  const normalizedReceipt = NormalizedReceiptSchema.parse({
    blockHash: data.blockHash,
    txHash: data.txId,
    settlementState: data.settlementState,
    adapterId,
    ...(data.normalizedReceipt && typeof data.normalizedReceipt === 'object' ? data.normalizedReceipt : {}),
  });
  return {
    intentId,
    adapterId,
    status: data.status,
    payload: data as unknown as Record<string, unknown>,
    txHash: data.txId ?? data.blockHash ?? null,
    blockHeight: data.blockHeight ?? null,
    settlementState: data.settlementState ?? null,
    receipt,
    lifecycleState,
    normalizedReceipt: normalizedReceipt as unknown as Record<string, unknown>,
  };
}

function isExecutionFailure(data: ExecutionResult): boolean {
  return data.status === 'failed' || data.settlementState === 'failed';
}

function matchesWebhookEventType(eventTypes: string[], eventType: string): boolean {
  return eventTypes.includes('*') || eventTypes.includes(eventType);
}

function webhookRetryDelayMs(attemptCount: number): number {
  return Math.min(15 * 60_000, 2_000 * 2 ** Math.max(0, attemptCount - 1));
}

function webhookRetryFailure(
  attemptCount: number,
  maxAttempts: number,
  fields: {
    responseStatus?: number;
    responseBody?: string;
    lastError?: string;
  }
): {
  attemptCount: number;
  nextAttemptAt: Date | null;
  responseStatus?: number;
  responseBody?: string;
  lastError?: string;
} {
  if (attemptCount >= maxAttempts) {
    return {
      ...fields,
      attemptCount,
      nextAttemptAt: null,
      lastError: fields.lastError
        ? `${fields.lastError} (max attempts reached)`
        : `Webhook delivery exhausted after ${attemptCount} attempts`,
    };
  }
  return {
    ...fields,
    attemptCount,
    nextAttemptAt: new Date(Date.now() + webhookRetryDelayMs(attemptCount)),
  };
}

type WebhookEventSource = 'audit' | 'anchor';

type WebhookDispatchEvent = {
  id: string;
  source: WebhookEventSource;
  eventType: string;
  intentId?: string;
  paymentAnchorId?: string;
  executionId?: string;
  payload: Record<string, unknown>;
  correlationId?: string;
  createdAt: Date;
};

function normalizeWebhookEventSource(value: string | null | undefined): WebhookEventSource {
  return value === 'anchor' ? 'anchor' : 'audit';
}

function optionalString(value: string | null | undefined): string | undefined {
  return value ?? undefined;
}

function errorMessage(error: unknown): string {
  return error instanceof Error ? error.message : String(error);
}

function serializeWebhookEventPayload(event: WebhookDispatchEvent) {
  return {
    id: event.id,
    source: event.source,
    eventType: event.eventType,
    ...(event.intentId ? { intentId: event.intentId } : {}),
    ...(event.paymentAnchorId ? { paymentAnchorId: event.paymentAnchorId } : {}),
    ...(event.executionId ? { executionId: event.executionId } : {}),
    payload: event.payload,
    ...(event.correlationId ? { correlationId: event.correlationId } : {}),
    createdAt: event.createdAt.toISOString(),
  };
}

function sortWebhookEvents<A extends { createdAt: Date; id: string }>(rows: A[]) {
  return [...rows].sort((left, right) => {
    const delta = left.createdAt.getTime() - right.createdAt.getTime();
    if (delta !== 0) return delta;
    return left.id.localeCompare(right.id);
  });
}

function defaultPolicy(env: AppEnv): PolicyConfig {
  return defaultPolicyConfigFromEnv(env);
}

type AnchorBondReconciliationJobData = {
  paymentAnchorId?: string;
  adapterId?: string;
  reason?: string;
};

type AnchorOnboardingJobData = {
  paymentAnchorId?: string;
  adapterId?: string;
  reason?: string;
  reconcileBond?: boolean;
};

type AnchorRouteProfile = {
  paymentAnchorId: string;
  allowed: boolean;
  scoreAdjustment: number;
  routingContext: RouteStepRoutingContext;
};

type AnchorRouteProfiles = {
  paymentAnchorIds: Record<string, string>;
  byAdapterId: Record<string, AnchorRouteProfile>;
};

function corridorKeyForIntent(intent: { baseAsset: string; quoteAsset: string }): string {
  return `${intent.baseAsset}:${intent.quoteAsset}`;
}

function readStringArray(value: unknown): string[] {
  return Array.isArray(value) ? value.filter((item): item is string => typeof item === 'string' && item.length > 0) : [];
}

function readFiniteNumber(value: unknown): number | undefined {
  return typeof value === 'number' && Number.isFinite(value) ? value : undefined;
}

function resolveAnchorCorridorMatch(
  anchor: {
    corridorKey: string | null;
    corridorConfig: Record<string, unknown> | null;
    metadata: Record<string, unknown> | null;
  },
  targetCorridorKey: string
): RouteStepRoutingContext['corridorMatch'] | 'mismatch' {
  if (anchor.corridorKey === targetCorridorKey) {
    return 'exact';
  }

  const configured = [
    ...readStringArray(anchor.corridorConfig?.supportedCorridors),
    ...readStringArray(anchor.corridorConfig?.corridors),
    ...readStringArray(anchor.metadata?.supportedCorridors),
  ];

  if (configured.includes(targetCorridorKey)) {
    return 'listed';
  }

  if (!anchor.corridorKey && configured.length === 0) {
    return 'unscoped';
  }

  return 'mismatch';
}

function resolveAnchorOperatorPriority(anchor: {
  corridorConfig: Record<string, unknown> | null;
  metadata: Record<string, unknown> | null;
}): number {
  return (
    readFiniteNumber(anchor.metadata?.routingPriority) ??
    readFiniteNumber(anchor.metadata?.operatorPriority) ??
    readFiniteNumber(anchor.corridorConfig?.routingPriority) ??
    0
  );
}

function asStoredVerificationSource(
  source: string
): 'database' | 'keeta' | undefined {
  return source === 'database' || source === 'keeta' ? source : undefined;
}

function serializeAnchorBond(
  bond: Awaited<ReturnType<typeof paymentAnchorRepo.getLatestAnchorBondForAnchor>>
): AnchorBondRecord | undefined {
  if (!bond) return undefined;
  const verificationSource =
    bond.verificationSource === 'database' || bond.verificationSource === 'keeta'
      ? bond.verificationSource
      : undefined;
  return {
    id: bond.id,
    paymentAnchorId: bond.paymentAnchorId,
    amountAtomic: bond.amountAtomic,
    assetId: bond.assetId,
    delayDays: AnchorWithdrawalDelayDaysSchema.parse(bond.delayDays),
    status: AnchorBondStatusSchema.parse(bond.status),
    lockTxHash: bond.lockTxHash ?? undefined,
    lockAccount: bond.lockAccount ?? undefined,
    withdrawalRequestedAt:
      bond.withdrawalRequestedAt instanceof Date
        ? bond.withdrawalRequestedAt.toISOString()
        : undefined,
    activatedAt:
      bond.activatedAt instanceof Date
        ? bond.activatedAt.toISOString()
        : undefined,
    releasedAt:
      bond.releasedAt instanceof Date
        ? bond.releasedAt.toISOString()
        : undefined,
    verified: bond.verified,
    verificationSource,
    verificationDetails: bond.verificationDetails ?? undefined,
    createdAt: bond.createdAt.toISOString(),
    updatedAt: bond.updatedAt.toISOString(),
  };
}

async function reconcileAnchorBondRecord(
  db: Database,
  anchor: Awaited<ReturnType<typeof paymentAnchorRepo.getPaymentAnchor>>,
  verifier: ReturnType<typeof createAnchorBondVerifier>,
  reason: string
): Promise<{ checked: boolean; changed: boolean }> {
  if (!anchor) {
    return { checked: false, changed: false };
  }
  const existing = await paymentAnchorRepo.getLatestAnchorBondForAnchor(db, anchor.id);
  if (!existing) {
    return { checked: false, changed: false };
  }

  const observation = await verifier.inspectBond({
    paymentAnchorId: anchor.id,
    adapterId: anchor.adapterId,
    bondId: existing.id,
    status: existing.status as AnchorBondStatus | undefined,
    delayDays: existing.delayDays as PolicyAnchorBondHint['delayDays'],
    lockTxHash: existing.lockTxHash ?? null,
    lockAccount: existing.lockAccount ?? null,
  });

  const previousStatus = existing.status as AnchorBondStatus;
  const previousVerified = existing.verified;
  const previousSource = existing.verificationSource ?? undefined;
  const nextStatus = observation.observedStatus;
  const nextVerified = observation.verified;
  const nextSource = asStoredVerificationSource(observation.source);
  const nextDetails = {
    ...(existing.verificationDetails ?? {}),
    ...observation.details,
    checkedAt: observation.checkedAt,
    observedStatus: observation.observedStatus,
    observedSource: observation.source,
    adapterId: anchor.adapterId,
    reason,
  };

  const changed =
    previousStatus !== nextStatus ||
    previousVerified !== nextVerified ||
    previousSource !== nextSource;

  await paymentAnchorRepo.updateAnchorBond(db, existing.id, {
    status: nextStatus,
    verified: nextVerified,
    verificationSource: nextSource,
    verificationDetails: nextDetails,
    activatedAt:
      nextStatus === 'active' && nextVerified && !existing.activatedAt
        ? new Date(observation.checkedAt)
        : undefined,
    withdrawalRequestedAt:
      nextStatus === 'withdrawal_requested' && !existing.withdrawalRequestedAt
        ? new Date(observation.checkedAt)
        : undefined,
    releasedAt:
      nextStatus === 'released' && !existing.releasedAt
        ? new Date(observation.checkedAt)
        : undefined,
  });

  if (changed) {
    await paymentAnchorRepo.insertAnchorEvent(db, {
      paymentAnchorId: anchor.id,
      anchorBondId: existing.id,
      eventType: 'payment_anchor.bond_reconciled',
      payload: {
        adapterId: anchor.adapterId,
        reason,
        checkedAt: observation.checkedAt,
        previous: {
          status: previousStatus,
          verified: previousVerified,
          verificationSource: previousSource,
        },
        current: {
          status: nextStatus,
          verified: nextVerified,
          verificationSource: nextSource ?? observation.source,
        },
        details: observation.details,
      },
    });
  }

  // Write bond health metrics to metric_samples for Phase 4 dynamic scoring
  const capturedAt = new Date();
  const bondAgeMs =
    existing.activatedAt ? capturedAt.getTime() - new Date(existing.activatedAt).getTime() : null;
  const bondAgeDays = bondAgeMs !== null ? bondAgeMs / (1000 * 60 * 60 * 24) : null;

  const bondMetrics = [
    {
      name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.bondVerified,
      labels: { adapterId: anchor.adapterId },
      value: nextVerified ? 1 : 0,
      capturedAt,
    },
    ...(bondAgeDays !== null
      ? [
          {
            name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.bondAgeDays,
            labels: { adapterId: anchor.adapterId, paymentAnchorId: anchor.id },
            value: bondAgeDays,
            capturedAt,
          },
        ]
      : []),
  ];
  for (const sample of bondMetrics) {
    await metricsRepo.insertMetricSample(db, sample);
  }

  return { checked: true, changed };
}

async function runAnchorBondReconciliation(
  db: Database,
  env: AppEnv,
  verifier: ReturnType<typeof createAnchorBondVerifier>,
  job: AnchorBondReconciliationJobData
): Promise<{ scanned: number; checked: number; changed: number }> {
  const reason = job.reason ?? 'scheduled';
  const anchors =
    job.paymentAnchorId
      ? [await paymentAnchorRepo.getPaymentAnchor(db, job.paymentAnchorId)]
      : job.adapterId
        ? [await paymentAnchorRepo.getPaymentAnchorByAdapterId(db, job.adapterId)]
        : await paymentAnchorRepo.listPaymentAnchorsByStatuses(
            db,
            ['bond_pending_lock', 'active', 'withdrawal_requested', 'released', 'suspended'],
            env.ANCHOR_BOND_RECONCILE_BATCH_SIZE
          );

  let scanned = 0;
  let checked = 0;
  let changed = 0;

  for (const anchor of anchors) {
    if (!anchor) continue;
    scanned += 1;
    const result = await reconcileAnchorBondRecord(db, anchor, verifier, reason);
    if (result.checked) checked += 1;
    if (result.changed) changed += 1;
  }

  return { scanned, checked, changed };
}

async function loadAnchorLifecycleSnapshot(
  db: Database,
  anchorId: string
): Promise<{
  anchor: NonNullable<Awaited<ReturnType<typeof paymentAnchorRepo.getPaymentAnchor>>>;
  snapshot: {
    status: PaymentAnchorStatus;
    commercialTerms: Record<string, unknown>;
    currentBond?: AnchorBondRecord;
  };
} | null> {
  const anchor = await paymentAnchorRepo.getPaymentAnchor(db, anchorId);
  if (!anchor) return null;
  const bond = await paymentAnchorRepo.getLatestAnchorBondForAnchor(db, anchor.id);
  return {
    anchor,
    snapshot: {
      status: PaymentAnchorStatusSchema.parse(anchor.status),
      commercialTerms: anchor.commercialTerms ?? {},
      currentBond: serializeAnchorBond(bond),
    },
  };
}

async function runAnchorOnboarding(
  db: Database,
  env: AppEnv,
  verifier: ReturnType<typeof createAnchorBondVerifier>,
  job: AnchorOnboardingJobData
): Promise<{ scanned: number; advanced: number; finalStatuses: Record<string, string> }> {
  const reason = job.reason ?? 'manual';
  const anchors =
    job.paymentAnchorId
      ? [await paymentAnchorRepo.getPaymentAnchor(db, job.paymentAnchorId)]
      : job.adapterId
        ? [await paymentAnchorRepo.getPaymentAnchorByAdapterId(db, job.adapterId)]
        : await paymentAnchorRepo.listPaymentAnchorsByStatuses(
            db,
            ['draft', 'commercial_defined', 'bond_required', 'bond_pending_lock', 'withdrawal_requested', 'released', 'active'],
            env.ANCHOR_BOND_RECONCILE_BATCH_SIZE
          );

  let scanned = 0;
  let advanced = 0;
  const finalStatuses: Record<string, string> = {};

  for (const anchor of anchors) {
    if (!anchor) continue;
    scanned += 1;

    if (job.reconcileBond !== false) {
      await reconcileAnchorBondRecord(db, anchor, verifier, `${reason}:onboarding_prefetch`);
    }

    let iterations = 0;
    while (iterations < 6) {
      iterations += 1;
      const loaded = await loadAnchorLifecycleSnapshot(db, anchor.id);
      if (!loaded) break;
      const onboarding = evaluatePaymentAnchorOnboarding(loaded.snapshot, {
        strictBondVerification: env.ANCHOR_BOND_STRICT === true,
      });

      finalStatuses[anchor.id] = loaded.anchor.status;
      if (onboarding.status !== 'advance' || !onboarding.nextStatus) {
        await paymentAnchorRepo.insertAnchorEvent(db, {
          paymentAnchorId: anchor.id,
          eventType: 'payment_anchor.onboarding_state_evaluated',
          payload: {
            reason,
            onboarding,
          },
        });
        break;
      }

      if (!canTransitionPaymentAnchorStatus(loaded.snapshot.status, onboarding.nextStatus)) {
        await paymentAnchorRepo.insertAnchorEvent(db, {
          paymentAnchorId: anchor.id,
          eventType: 'payment_anchor.onboarding_blocked',
          payload: {
            reason,
            onboarding,
            message: `Cannot transition from ${loaded.snapshot.status} to ${onboarding.nextStatus}`,
          },
        });
        break;
      }

      const updated = await paymentAnchorRepo.updatePaymentAnchor(db, anchor.id, {
        status: onboarding.nextStatus,
      });
      if (!updated) break;

      advanced += 1;
      finalStatuses[anchor.id] = updated.status;
      await paymentAnchorRepo.insertAnchorEvent(db, {
        paymentAnchorId: anchor.id,
        eventType: 'payment_anchor.onboarding_advanced',
        payload: {
          reason,
          from: loaded.snapshot.status,
          to: onboarding.nextStatus,
          onboardingReason: onboarding.reason,
        },
      });
    }
  }

  return { scanned, advanced, finalStatuses };
}

async function buildAnchorBondHints(
  db: Database,
  routePlan: { steps: Array<{ adapterId: string; venueKind?: string }> },
  strictVerifier: ReturnType<typeof createAnchorBondVerifier>
): Promise<Record<string, PolicyAnchorBondHint>> {
  const anchorAdapterIds = [...new Set(routePlan.steps.filter((step) => step.venueKind === 'anchor').map((step) => step.adapterId))];
  const hints: Record<string, PolicyAnchorBondHint> = {};

  for (const adapterId of anchorAdapterIds) {
    const anchor = await paymentAnchorRepo.getPaymentAnchorByAdapterId(db, adapterId);
    if (!anchor) {
      hints[adapterId] = {
        paymentAnchorId: '00000000-0000-0000-0000-000000000000',
        adapterId,
        anchorStatus: 'missing',
        bondStatus: 'missing',
        verified: false,
        verificationSource: 'strict-missing',
      };
      continue;
    }
    const bond = await paymentAnchorRepo.getLatestAnchorBondForAnchor(db, anchor.id);
    const verification = await strictVerifier.verifyBond({
      paymentAnchorId: anchor.id,
      adapterId,
      bondId: bond?.id,
      status: bond?.status as AnchorBondStatus | undefined,
      delayDays: bond?.delayDays as PolicyAnchorBondHint['delayDays'],
      lockTxHash: bond?.lockTxHash ?? null,
      lockAccount: bond?.lockAccount ?? null,
    });
    hints[adapterId] = {
      paymentAnchorId: anchor.id,
      adapterId,
      anchorStatus: anchor.status as PolicyAnchorBondHint['anchorStatus'],
      bondStatus: (bond?.status as PolicyAnchorBondHint['bondStatus']) ?? 'missing',
      amountAtomic: bond?.amountAtomic,
      assetId: bond?.assetId,
      delayDays: bond?.delayDays as PolicyAnchorBondHint['delayDays'],
      lockTxHash: bond?.lockTxHash ?? null,
      verified: verification.verified,
      verificationSource: verification.source,
    };
  }

  return hints;
}

async function buildAnchorRoutingProfiles(
  db: Database,
  intent: { baseAsset: string; quoteAsset: string },
  strictVerifier: ReturnType<typeof createAnchorBondVerifier>,
  metricsCache: OperatorMetricsCache,
  env: AppEnv
): Promise<AnchorRouteProfiles> {
  const paymentAnchorIds: Record<string, string> = {};
  const byAdapterId: Record<string, AnchorRouteProfile> = {};
  const targetCorridorKey = corridorKeyForIntent(intent);

  // Pre-fetch operator metrics for all anchor adapters in one parallel batch
  const anchorAdapters = (activeRegistry?.list() ?? []).filter((a) => a.kind === 'anchor');
  const cachedMetrics = await Promise.all(
    anchorAdapters.map((a) =>
      fetchOperatorMetrics(metricsCache, db, a.id, targetCorridorKey).catch(() => null)
    )
  );
  const metricsByAdapterId = new Map(
    anchorAdapters.map((a, i) => [a.id, cachedMetrics[i] ?? null])
  );

  for (const adapter of activeRegistry?.list() ?? []) {
    if (adapter.kind !== 'anchor') continue;
    const anchor = await paymentAnchorRepo.getPaymentAnchorByAdapterId(db, adapter.id);
    if (!anchor) continue;

    paymentAnchorIds[adapter.id] = anchor.id;

    const bond = await paymentAnchorRepo.getLatestAnchorBondForAnchor(db, anchor.id);
    const serializedBond = serializeAnchorBond(bond);
    const readiness = evaluatePaymentAnchorReadiness(
      {
        status: PaymentAnchorStatusSchema.parse(anchor.status),
        commercialTerms: anchor.commercialTerms ?? {},
        currentBond: serializedBond,
      },
      { strictBondVerification: true }
    );
    const verification = await strictVerifier.verifyBond({
      paymentAnchorId: anchor.id,
      adapterId: adapter.id,
      bondId: bond?.id,
      status: bond?.status as AnchorBondStatus | undefined,
      delayDays: bond?.delayDays as PolicyAnchorBondHint['delayDays'],
      lockTxHash: bond?.lockTxHash ?? null,
      lockAccount: bond?.lockAccount ?? null,
    });

    const corridorMatch = resolveAnchorCorridorMatch(anchor, targetCorridorKey);
    const supportsRequestedAssets =
      anchor.supportedAssets.length === 0 ||
      (anchor.supportedAssets.includes(intent.baseAsset) && anchor.supportedAssets.includes(intent.quoteAsset));
    const commercialVolumeFeeBps =
      typeof anchor.commercialTerms?.volumeFeeBps === 'number' ? anchor.commercialTerms.volumeFeeBps : undefined;
    const operatorPriority = resolveAnchorOperatorPriority(anchor);
    const scoreAdjustments: RouteScoreAdjustment[] = [];

    if (corridorMatch === 'exact') {
      scoreAdjustments.push({ source: 'anchor_corridor_exact_match', value: 12 });
    } else if (corridorMatch === 'listed') {
      scoreAdjustments.push({ source: 'anchor_corridor_listed_match', value: 6 });
    }

    if (typeof commercialVolumeFeeBps === 'number' && commercialVolumeFeeBps > 0) {
      scoreAdjustments.push({
        source: 'anchor_commercial_volume_fee',
        value: -commercialVolumeFeeBps,
      });
    }

    if (operatorPriority !== 0) {
      scoreAdjustments.push({ source: 'anchor_operator_priority', value: operatorPriority });
    }

    if (readiness.status === 'needs_attention') {
      scoreAdjustments.push({
        source: 'anchor_readiness_attention_penalty',
        value: -3,
      });
    }

    const adapterMetrics = metricsByAdapterId.get(adapter.id) ?? null;
    const { adjustments: dynamicAdjustments, block: dynamicBlock } = buildDynamicScoreAdjustments(
      adapterMetrics,
      env
    );
    for (const adj of dynamicAdjustments) {
      scoreAdjustments.push(adj);
    }

    const scoreAdjustment = scoreAdjustments.reduce((sum, component) => sum + component.value, 0);
    const allowed =
      !dynamicBlock &&
      corridorMatch !== 'mismatch' &&
      supportsRequestedAssets &&
      readiness.canServeLiveTraffic &&
      verification.verified === true;

    byAdapterId[adapter.id] = {
      paymentAnchorId: anchor.id,
      allowed,
      scoreAdjustment,
      routingContext: {
        corridorKey: targetCorridorKey,
        corridorMatch: corridorMatch === 'mismatch' ? undefined : corridorMatch,
        readinessStatus: readiness.status,
        ...(typeof commercialVolumeFeeBps === 'number'
          ? { commercialVolumeFeeBps }
          : {}),
        ...(operatorPriority !== 0 ? { operatorPriority } : {}),
        ...(typeof adapterMetrics?.successRate === 'number'
          ? { operatorSuccessRate: adapterMetrics.successRate }
          : {}),
        ...(typeof adapterMetrics?.p95LatencyMs === 'number'
          ? { operatorP95LatencyMs: adapterMetrics.p95LatencyMs }
          : {}),
        ...(typeof adapterMetrics?.unsettledVolume === 'number'
          ? { operatorUnsettledVolume: adapterMetrics.unsettledVolume }
          : {}),
        ...(typeof adapterMetrics?.bondVerified === 'boolean'
          ? { operatorBondVerified: adapterMetrics.bondVerified }
          : {}),
        scoreAdjustment,
        scoreAdjustments,
      },
    };
  }

  return { paymentAnchorIds, byAdapterId };
}

function hydrateRoutePlanKinds<T extends { steps: Array<{ adapterId: string; venueKind?: string }> }>(
  routePlan: T
): T {
  return {
    ...routePlan,
    steps: routePlan.steps.map((step) => ({
      ...step,
      venueKind: step.venueKind ?? registryFallbackKind(step.adapterId),
    })),
  } as T;
}

function registryFallbackKind(adapterId: string): string | undefined {
  const adapter = activeRegistry?.get(adapterId);
  return adapter?.kind;
}

let activeRegistry: AdapterRegistry | null = null;

async function buildKeetaSimulationSnapshot(
  env: AppEnv,
  db: Database,
  intent: { walletId: string },
  scenario: SimulationScenario
): Promise<KeetaSimulationSnapshot | undefined> {
  if (scenario.fidelityMode === 'standard') return undefined;
  const health = await readChainHealth(env.KEETA_NETWORK).catch((e) => {
    log.warn({ err: e }, 'readChainHealth failed in simulation');
    return null;
  });
  const w = await walletRepo.getWallet(db, intent.walletId);
  let walletBalances: { assetId: string; amount: string }[] | undefined;
  if (w) {
    walletBalances = await getBalances(w.address, env.KEETA_NETWORK).catch(() => []);
  }
  const replayAnchor =
    scenario.fidelityMode === 'replay' && health?.ok
      ? `replay:${env.KEETA_NETWORK}:${health.ledger?.blockCount ?? 0}:${health.measuredAt}`
      : undefined;
  return {
    network: env.KEETA_NETWORK,
    capturedAt: new Date().toISOString(),
    fidelityMode: scenario.fidelityMode,
    ledgerBlockCount: health?.ledger?.blockCount,
    representativeCount: health?.ledger?.representativeCount,
    chainLatencyMs: health?.latencyMs,
    walletBalances,
    replayAnchor,
  };
}

async function killSwitchActive(db: Database, env: AppEnv): Promise<boolean> {
  if (env.EXECUTION_KILL_SWITCH) return true;
  const row = await settingsRepo.getSetting(db, 'execution_kill_switch');
  return row?.value?.enabled === true;
}

async function closeWithTimeout(
  label: string,
  timeoutMs: number,
  closer: () => Promise<unknown>
): Promise<void> {
  let timer: NodeJS.Timeout | undefined;
  try {
    await Promise.race([
      closer().then(() => {
        if (timer) clearTimeout(timer);
      }),
      new Promise<never>((_, reject) => {
        timer = setTimeout(() => reject(new Error(`${label} timed out after ${timeoutMs}ms`)), timeoutMs);
      }),
    ]);
  } catch (error) {
    log.warn({ err: error, label }, 'shutdown step did not complete cleanly');
  } finally {
    if (timer) clearTimeout(timer);
  }
}

type RuntimePolicyPackSummary = {
  id: string;
  name: string;
  source: PolicyPackSource;
};

type ResolvedRuntimePolicyPack =
  | { policyPack: null }
  | { policyPack: PolicyPack; source: RuntimePolicyPackSummary['source'] }
  | {
      error: string;
      source: RuntimePolicyPackSummary['source'];
      policyPackId: string;
    };

function policyVersionHash(cfg: PolicyConfig, policyPack: RuntimePolicyPackSummary | null): string {
  return createHash('sha256')
    .update(
      JSON.stringify({
        config: cfg,
        policyPackId: policyPack?.id ?? null,
      })
    )
    .digest('hex')
    .slice(0, 24);
}

function strategyPolicyPackId(config: unknown): string | undefined {
  if (!config || typeof config !== 'object') {
    return undefined;
  }
  const value = (config as Record<string, unknown>).policyPackId;
  return typeof value === 'string' ? value : undefined;
}

function walletDefaultPolicyPackId(settings: unknown): string | undefined {
  if (!settings || typeof settings !== 'object') {
    return undefined;
  }
  const value = (settings as Record<string, unknown>).defaultPolicyPackId;
  return typeof value === 'string' ? value : undefined;
}

function serializeRuntimePolicyPack(row: Awaited<ReturnType<typeof policyRepo.getPolicyPackById>>): PolicyPack | null {
  if (!row) {
    return null;
  }
  return {
    id: row.id,
    name: row.name,
    description: row.description ?? null,
    rules: row.rules ?? [],
    compositions: row.compositions ?? [],
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

async function resolveRuntimePolicyPack(
  db: Database,
  intent: ExecutionIntent,
  env: AppEnv
): Promise<ResolvedRuntimePolicyPack> {
  const wallet = await walletRepo.getWallet(db, intent.walletId);
  const strategy = intent.strategyId ? await strategyRepo.getStrategyById(db, intent.strategyId) : null;
  const globalDefaultPolicyPackId = (await settingsRepo.getDefaultPolicyPackId(db)) ?? env.DEFAULT_POLICY_PACK_ID ?? null;
  const resolved = await resolveStoredPolicyPackSelection({
    intent,
    walletDefaultPolicyPackId: walletDefaultPolicyPackId(wallet?.settings),
    strategyPolicyPackId: strategyPolicyPackId(strategy?.config),
    globalDefaultPolicyPackId,
    loadPolicyPack: async (id) => serializeRuntimePolicyPack(await policyRepo.getPolicyPackById(db, id)),
  });

  if ('error' in resolved) {
    return {
      error: resolved.error.message,
      source: resolved.error.source,
      policyPackId: resolved.error.policyPackId,
    };
  }
  if (!resolved.policyPack) {
    return { policyPack: null };
  }
  return {
    policyPack: resolved.policyPack,
    source: resolved.source,
  };
}

function blockedPolicyDecision(
  intentId: string,
  reason: string,
  policyPackSummary?: { id: string; source: PolicyPackSource; name?: string } | null
): {
  intentId: string;
  allowed: false;
  summary: string;
  contributions: Array<{ ruleId: string; passed: false; reason: string }>;
  effectivePolicyPackId?: string;
  effectivePolicyPackName?: string;
  effectivePolicyPackSource?: PolicyPackSource;
  policyPack?: RuntimePolicyPackSummary;
  evaluatedAt: string;
} {
  return {
    intentId,
    allowed: false,
    summary: reason,
    contributions: [
      {
        ruleId: 'policy_pack_resolution',
        passed: false,
        reason,
      },
    ],
    ...(policyPackSummary
      ? {
          effectivePolicyPackId: policyPackSummary.id,
          ...(policyPackSummary.name ? { effectivePolicyPackName: policyPackSummary.name } : {}),
          effectivePolicyPackSource: policyPackSummary.source,
          ...(policyPackSummary.name
            ? {
                policyPack: {
                  id: policyPackSummary.id,
                  name: policyPackSummary.name,
                  source: policyPackSummary.source,
                },
              }
            : {}),
        }
      : {}),
    evaluatedAt: new Date().toISOString(),
  };
}

function buildIdentityHints(intent: ExecutionIntent): PolicyIdentityHints {
  const meta = (intent.metadata ?? {}) as Record<string, unknown>;
  return {
    strategyId: intent.strategyId,
    agentId: typeof meta.agentId === 'string' ? meta.agentId : undefined,
    clientId: typeof meta.clientId === 'string' ? meta.clientId : undefined,
    hasAttestation:
      typeof meta.identityAttestation === 'string' && (meta.identityAttestation as string).length > 0,
    certificateFingerprint:
      typeof meta.identityCertFingerprint === 'string' ? meta.identityCertFingerprint : undefined,
  };
}

export async function runWorkerApp(options: WorkerAppOptions = {}): Promise<() => Promise<void>> {
  const env = options.env ?? loadEnv();
  initTracing({
    serviceName: env.OTEL_SERVICE_NAME ?? 'keeta-agent-worker',
    enabled: env.OTEL_ENABLED,
    consoleExporter: env.OTEL_CONSOLE_EXPORTER,
    exporterUrl: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });
  const getSigningUserClient = createSigningGetter(env);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const db = createDb(env.DATABASE_URL);
  const operatorMetrics = new OperatorMetricsCache(redis, env.OPERATOR_METRICS_TTL_MS);

  const registry = options.registry ?? createDefaultDevRegistry();
  activeRegistry = registry;

  const router = new Router(registry);
  const policyCfg = defaultPolicy(env);
  const anchorBondVerifier = createAnchorBondVerifier(env);

  const connection = { connection: { url: env.REDIS_URL } };
  const workers: Worker[] = [];
  const queuesForMetrics: Queue[] = [];
  const deadLetterQueue = new Queue(QUEUE_NAMES.deadLetter, connection);

  async function withQueueJobSpan<T>(
    queueName: string,
    job: { id?: string | number | null; name: string; data: unknown },
    attributes: TelemetryAttributes,
    fn: () => Promise<T>
  ): Promise<T> {
    const meta = readTraceMetadata(job.data);
    const jobId = job.id === null || job.id === undefined ? undefined : String(job.id);
    return withLogContext(
      {
        requestId: meta.requestId,
        queueName,
        jobId,
      },
      () =>
        withSpan(
          `worker.${queueName}.${job.name}`,
          {
            tracerName: 'keeta-agent-worker',
            kind: 'consumer',
            parentTraceparent: meta.traceparent,
            attributes: {
              'queue.name': queueName,
              'job.name': job.name,
              'job.id': jobId,
              'request.id': meta.requestId,
              ...attributes,
            },
          },
          fn
        )
    );
  }

  const qNames = [
    QUEUE_NAMES.quoteGeneration,
    QUEUE_NAMES.routeGeneration,
    QUEUE_NAMES.policyEvaluation,
    QUEUE_NAMES.executionProcessing,
    QUEUE_NAMES.simulationRuns,
    QUEUE_NAMES.telemetryFlush,
    QUEUE_NAMES.anchorBondReconciliation,
    QUEUE_NAMES.anchorOnboarding,
    QUEUE_NAMES.webhookEventDelivery,
  ] as const;
  for (const n of qNames) {
    queuesForMetrics.push(new Queue(n, connection));
  }

async function transitionIntent(db: Database, intentId: string, fromStatus: string, to: IntentPipelineState) {
  if (!canTransitionIntentStatus(fromStatus, to)) {
    throw new UnrecoverableError(`Invalid intent transition ${fromStatus} -> ${to}`);
  }
  await intentRepo.updateIntentStatus(db, intentId, to);
}

async function withDatabaseTransaction<T>(
  db: Database,
  fn: (tx: Database) => Promise<T>
): Promise<T> {
  return db.transaction(async (tx) => fn(tx as unknown as Database));
}

  const quoteWorker = new Worker(
    QUEUE_NAMES.quoteGeneration,
    async (job) =>
      withQueueJobSpan(
        QUEUE_NAMES.quoteGeneration,
        job,
        { intentId: typeof job.data?.intentId === 'string' ? job.data.intentId : undefined },
        async () => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      if (!canTransitionIntentStatus(row.status, 'quoted')) {
        throw new UnrecoverableError(`Cannot quote from status ${row.status}`);
      }
      const intent = ExecutionIntentSchema.parse(row.payload);
      const successfulQuotes: Array<{
        intentId: string;
        adapterId: string;
        payload: Record<string, unknown>;
      }> = [];
      for (const adapter of registry.list()) {
        if (!adapter.supportsPair(intent.baseAsset, intent.quoteAsset)) continue;
        const q = await withSpan(
          'worker.quote.adapter.get',
          {
            tracerName: 'keeta-agent-worker',
            attributes: {
              adapterId: adapter.id,
              intentId: intent.id,
              baseAsset: intent.baseAsset,
              quoteAsset: intent.quoteAsset,
            },
          },
          () =>
            adapter.getQuote({
              adapterId: adapter.id,
              baseAsset: intent.baseAsset,
              quoteAsset: intent.quoteAsset,
              side: intent.side,
              size: intent.size,
              intentId: intent.id,
            })
        );
        if (q.success) {
          successfulQuotes.push({
            intentId: intent.id,
            adapterId: adapter.id,
            payload: q.data as unknown as Record<string, unknown>,
          });
        }
      }
      await withDatabaseTransaction(db, async (txDb) => {
        await snapshotRepo.insertIntentSnapshot(txDb, {
          intentId,
          payload: row.payload,
        });
        for (const quote of successfulQuotes) {
          await quoteRepo.insertQuote(txDb, quote);
        }
        await transitionIntent(txDb, intentId, row.status, 'quoted');
        await auditRepo.insertAuditEvent(txDb, {
          intentId,
          eventType: 'intent.quoted',
          payload: { intentId },
          correlationId: job.id,
        });
      });
        }
      ),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.quoteGeneration) }
  );
  workers.push(quoteWorker);

  const routeWorker = new Worker(
    QUEUE_NAMES.routeGeneration,
    async (job) =>
      withQueueJobSpan(
        QUEUE_NAMES.routeGeneration,
        job,
        { intentId: typeof job.data?.intentId === 'string' ? job.data.intentId : undefined },
        async () => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      if (!canTransitionIntentStatus(row.status, 'routed')) {
        throw new UnrecoverableError(`Cannot route from status ${row.status}`);
      }
      const intent = ExecutionIntentSchema.parse(row.payload);
      const anchorRoutingProfiles =
        intent.mode === 'live'
          ? await buildAnchorRoutingProfiles(db, intent, anchorBondVerifier, operatorMetrics, env)
          : { paymentAnchorIds: {} as Record<string, string>, byAdapterId: {} as Record<string, AnchorRouteProfile> };
      const { best } = await withSpan(
        'worker.route.build',
        {
          tracerName: 'keeta-agent-worker',
          attributes: {
            intentId: intent.id,
            baseAsset: intent.baseAsset,
            quoteAsset: intent.quoteAsset,
          },
        },
        () =>
          router.buildPlans(intent, {
            canUseAdapter: (adapter) =>
              intent.mode !== 'live' ||
              adapter.kind !== 'anchor' ||
              anchorRoutingProfiles.byAdapterId[adapter.id]?.allowed === true,
            describeAdapter: (adapter) => {
              const profile = anchorRoutingProfiles.byAdapterId[adapter.id];
              return {
                ...(anchorRoutingProfiles.paymentAnchorIds[adapter.id]
                  ? { paymentAnchorId: anchorRoutingProfiles.paymentAnchorIds[adapter.id] }
                  : {}),
                ...(profile?.routingContext ? { routingContext: profile.routingContext } : {}),
              };
            },
            scoreAdapter: (adapter) => anchorRoutingProfiles.byAdapterId[adapter.id]?.scoreAdjustment ?? 0,
          })
      );
      const plan = RoutePlanSchema.parse(best);
      const steps = plan.steps.map((step) => ({
        planId: plan.id,
        stepIndex: step.stepIndex,
        adapterId: step.adapterId,
        payload: step as unknown as Record<string, unknown>,
      }));
      await withDatabaseTransaction(db, async (txDb) => {
        await routeRepo.insertRoutePlan(txDb, {
          id: plan.id,
          intentId: intent.id,
          score: plan.score,
          payload: plan as unknown as Record<string, unknown>,
        });
        await routeRepo.insertRouteSteps(txDb, steps);
        await snapshotRepo.insertRouteSnapshot(txDb, {
          intentId,
          routePlanId: plan.id,
          payload: plan as unknown as Record<string, unknown>,
        });
        await transitionIntent(txDb, intentId, row.status, 'routed');
        await auditRepo.insertAuditEvent(txDb, {
          intentId,
          eventType: 'intent.routed',
          payload: { routePlanId: plan.id },
          correlationId: job.id,
        });
      });
        }
      ),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.routeGeneration) }
  );
  workers.push(routeWorker);

  const policyWorker = new Worker(
    QUEUE_NAMES.policyEvaluation,
    async (job) =>
      withQueueJobSpan(
        QUEUE_NAMES.policyEvaluation,
        job,
        { intentId: typeof job.data?.intentId === 'string' ? job.data.intentId : undefined },
        async () => {
      const intentId = job.data.intentId as string;
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      if (!canTransitionIntentStatus(row.status, 'policy_checked')) {
        throw new UnrecoverableError(`Cannot policy-check from status ${row.status}`);
      }
      const intent = ExecutionIntentSchema.parse(row.payload);
      let routeRow = await routeRepo.getRoutePlanForIntent(db, intentId);
      const override = await routeOverrideRepo.getLatestRouteOverrideForIntent(db, intentId);
      if (override) {
        const alt = await routeRepo.getRoutePlanById(db, override.routePlanId);
        if (alt && alt.intentId === intentId) {
          routeRow = alt;
        }
      }
      const routePlan = routeRow ? hydrateRoutePlanKinds(RoutePlanSchema.parse(routeRow.payload)) : undefined;
      const anchorBonds = routePlan ? await buildAnchorBondHints(db, routePlan, anchorBondVerifier) : undefined;
      let keetaHints: PolicyKeetaHints | undefined;
      if (policyCfg.keetaPolicyEnabled === true) {
        const w = await walletRepo.getWallet(db, intent.walletId);
        if (w) {
          const am = new AccountManager(env.KEETA_NETWORK);
          const acct = await am.getAccount(w.address).catch(() => null);
          const health = await readChainHealth(env.KEETA_NETWORK).catch(() => null);
          const meta = intent.metadata as Record<string, unknown> | undefined;
          keetaHints = {
            network: env.KEETA_NETWORK,
            accountHeadBlockHeight: acct?.currentHeadBlockHeight ?? null,
            ledgerBlockCount: health?.ledger?.blockCount,
            measuredAt: health?.measuredAt,
          };
          if (meta && typeof meta.identityCertFingerprint === 'string' && meta.identityCertFingerprint.length > 0) {
            keetaHints = { ...keetaHints, identity: { certificateFingerprintPresent: true } };
          }
        }
      }
      const identityHints = buildIdentityHints(intent);
      const start = new Date();
      start.setUTCHours(0, 0, 0, 0);
      const portfolioStats: PolicyPortfolioStats = {
        dailyTradeCount: await executionRepo.countTradesSince(db, start),
        unsettledExecutions: await executionRepo.countUnsettledExecutions(db),
        openExposureByAsset: {},
        openExposureByVenue: {},
        walletExposure: 0,
      };
      const resolvedPolicyPack = await resolveRuntimePolicyPack(db, intent, env);
      const policyEngine = new PolicyEngine();
      const policyPackSummary: RuntimePolicyPackSummary | null =
        'policyPack' in resolvedPolicyPack && resolvedPolicyPack.policyPack
          ? {
              id: resolvedPolicyPack.policyPack.id,
              name: resolvedPolicyPack.policyPack.name,
              source: resolvedPolicyPack.source,
            }
          : null;
      let policyPackWarnings: string[] | undefined;
      let decision: PolicyDecision;

      if ('error' in resolvedPolicyPack) {
        decision = blockedPolicyDecision(intent.id, resolvedPolicyPack.error, {
          id: resolvedPolicyPack.policyPackId,
          source: resolvedPolicyPack.source,
        });
      } else {
        let customRuleConfig: Record<string, unknown> | undefined;
        if (resolvedPolicyPack.policyPack) {
          const applied = applyPolicyPack(policyEngine, resolvedPolicyPack.policyPack);
          customRuleConfig = applied.customRuleConfig;
          if (applied.warnings.length > 0) {
            policyPackWarnings = applied.warnings;
          }
        }
        decision = await withSpan(
          'worker.policy.evaluate',
          {
            tracerName: 'keeta-agent-worker',
            attributes: {
              intentId: intent.id,
              routePlanId: routePlan?.id,
              ...(policyPackSummary ? { policyPackId: policyPackSummary.id } : {}),
            },
          },
          () =>
            Promise.resolve(
              policyEngine.evaluate({
                intent,
                routePlan,
                config: policyCfg,
                keetaHints,
                anchorBonds,
                portfolioStats,
                identityHints,
                customRuleConfig,
              })
            )
        );
        if (policyPackSummary) {
          decision = {
            ...decision,
            effectivePolicyPackId: policyPackSummary.id,
            effectivePolicyPackName: policyPackSummary.name,
            effectivePolicyPackSource: policyPackSummary.source,
            policyPack: policyPackSummary,
          };
        }
        if (policyPackWarnings) {
          decision = {
            ...decision,
            policyPackWarnings,
          };
        }
      }
      const w = await walletRepo.getWallet(db, intent.walletId);
      await withDatabaseTransaction(db, async (txDb) => {
        await policyRepo.insertPolicyDecision(txDb, {
          intentId: intent.id,
          payload: decision as unknown as Record<string, unknown>,
          ruleContributions: decision.contributions as unknown[],
        });
        await snapshotRepo.insertPolicySnapshot(txDb, {
          intentId,
          policyConfigHash: policyVersionHash(policyCfg, policyPackSummary),
          payload: {
            config: policyCfg,
            evaluatedAt: decision.evaluatedAt,
            ...(decision.effectivePolicyPackId
              ? {
                  effectivePolicyPackId: decision.effectivePolicyPackId,
                  effectivePolicyPackName: decision.effectivePolicyPackName,
                  effectivePolicyPackSource: decision.effectivePolicyPackSource,
                }
              : {}),
            ...(policyPackSummary ? { policyPack: policyPackSummary } : {}),
            ...(policyPackWarnings ? { policyPackWarnings } : {}),
          },
        });
        await intentRepo.updateIntentFields(txDb, intentId, {
          payload: {
            ...intent,
            ...(decision.effectivePolicyPackId
              ? {
                  effectivePolicyPackId: decision.effectivePolicyPackId,
                  effectivePolicyPackName: decision.effectivePolicyPackName,
                  effectivePolicyPackSource: decision.effectivePolicyPackSource,
                }
              : {}),
          } as unknown as Record<string, unknown>,
        });
        await transitionIntent(txDb, intentId, row.status, 'policy_checked');
        if (!decision.allowed) {
          await metricsRepo.insertMetricSample(txDb, {
            name: 'metric.policy_rejection',
            labels: {
              intentId,
              rules: decision.contributions
                .filter((c) => !c.passed)
                .map((c) => c.ruleId)
                .join(','),
            },
            value: 1,
          });
          await auditRepo.insertAuditEvent(txDb, {
            intentId,
            eventType: 'policy.blocked',
            payload: {
              summary: decision.summary,
              failedRuleIds: decision.contributions.filter((c) => !c.passed).map((c) => c.ruleId),
              ...(decision.effectivePolicyPackId
                ? {
                    effectivePolicyPackId: decision.effectivePolicyPackId,
                    effectivePolicyPackName: decision.effectivePolicyPackName,
                    effectivePolicyPackSource: decision.effectivePolicyPackSource,
                  }
                : {}),
              ...(policyPackSummary ? { policyPack: policyPackSummary } : {}),
              ...(policyPackWarnings ? { policyPackWarnings } : {}),
            },
            correlationId: job.id,
          });
        }
        if (w) {
          await portfolioRepo.upsertPortfolioState(txDb, intent.walletId, {
            lastPolicyAt: decision.evaluatedAt,
            contributions: decision.contributions,
          });
        }
        await auditRepo.insertAuditEvent(txDb, {
          intentId,
          eventType: 'policy.evaluated',
          payload: {
            allowed: decision.allowed,
            summary: decision.summary,
            ...(decision.effectivePolicyPackId
              ? {
                  effectivePolicyPackId: decision.effectivePolicyPackId,
                  effectivePolicyPackName: decision.effectivePolicyPackName,
                  effectivePolicyPackSource: decision.effectivePolicyPackSource,
                }
              : {}),
            ...(policyPackSummary ? { policyPack: policyPackSummary } : {}),
            ...(policyPackWarnings ? { policyPackWarnings } : {}),
          },
          correlationId: job.id,
        });
      });
        }
      ),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.policyEvaluation) }
  );
  workers.push(policyWorker);

  const execWorker = new Worker(
    QUEUE_NAMES.executionProcessing,
    async (job) =>
      withQueueJobSpan(
        QUEUE_NAMES.executionProcessing,
        job,
        { intentId: typeof job.data?.intentId === 'string' ? job.data.intentId : undefined },
        async () => {
      const intentId = job.data.intentId as string;
      if (await killSwitchActive(db, env)) {
        log.warn({ intentId }, 'Execution blocked by kill switch');
        throw new UnrecoverableError('Execution kill switch is active');
      }
      const row = await intentRepo.getIntentById(db, intentId);
      if (!row) throw new Error('Intent not found');
      if (row.status === 'held') {
        throw new UnrecoverableError('Intent is held');
      }
      const intent = ExecutionIntentSchema.parse(row.payload);
      if (intent.strategyId) {
        const strat = await strategyRepo.getStrategyById(db, intent.strategyId);
        if (strat?.paused) {
          throw new UnrecoverableError('Strategy is paused');
        }
      }
      if (
        intent.mode === 'live' &&
        row.requiresApproval &&
        row.approvalStatus !== 'approved'
      ) {
        throw new UnrecoverableError('Live execution requires approval');
      }
      if (!canTransitionIntentStatus(row.status, 'executed')) {
        throw new UnrecoverableError(`Cannot execute from status ${row.status}`);
      }
      const latestPolicyDecision = await policyRepo.getLatestPolicyDecisionForIntent(db, intentId);
      if (!latestPolicyDecision) {
        throw new UnrecoverableError('Policy decision missing for execution');
      }
      const policyDecision = PolicyDecisionSchema.parse(latestPolicyDecision.payload);
      const executionPolicyPackFields =
        policyDecision.effectivePolicyPackId
          ? {
              effectivePolicyPackId: policyDecision.effectivePolicyPackId,
              effectivePolicyPackName: policyDecision.effectivePolicyPackName,
              effectivePolicyPackSource: policyDecision.effectivePolicyPackSource,
            }
          : {};
      if (!policyDecision.allowed) {
        throw new UnrecoverableError(`Policy blocked execution: ${policyDecision.summary}`);
      }
      let routeRow = await routeRepo.getRoutePlanForIntent(db, intentId);
      const override = await routeOverrideRepo.getLatestRouteOverrideForIntent(db, intentId);
      if (override) {
        const alt = await routeRepo.getRoutePlanById(db, override.routePlanId);
        if (alt && alt.intentId === intentId) {
          routeRow = alt;
          await auditRepo.insertAuditEvent(db, {
            intentId,
            eventType: 'route.override_used',
            payload: { routePlanId: override.routePlanId },
            correlationId: job.id,
          });
        }
      }
      if (!routeRow) throw new Error('Route not found');
      const plan = RoutePlanSchema.parse(routeRow.payload);
      if (plan.steps.length === 0) throw new Error('No route steps');
      const mode = intent.mode;
      if (mode === 'live' && (await executionRepo.hasBlockingExecutionForIntent(db, intentId))) {
        await auditRepo.insertAuditEvent(db, {
          intentId,
          eventType: 'execution.dedup_skipped',
          payload: { reason: 'already_submitted_or_confirmed' },
          correlationId: job.id,
        });
        return;
      }
      const signing = getSigningUserClient();
      const extensions: Record<string, unknown> = {};
      if (mode === 'live' && signing) {
        extensions[KEETA_USER_CLIENT_EXTENSION] = signing;
        if (env.KEETA_EXPLORER_TX_URL_TEMPLATE) {
          extensions.keetaExplorerTxUrlTemplate = env.KEETA_EXPLORER_TX_URL_TEMPLATE;
        }
      }
      const currentIntentStatus = row.status;
      let lastExecutionId: string | undefined;
      let lastReceiptRef: string | undefined;
      for (const step of plan.steps) {
        const adapter = registry.get(step.adapterId);
        if (!adapter) {
          throw new Error(`Adapter missing for step ${step.stepIndex}: ${step.adapterId}`);
        }
        const execStartedAt = new Date();
        const res = await withSpan(
          'worker.execution.adapter.execute',
          {
            tracerName: 'keeta-agent-worker',
            attributes: {
              adapterId: adapter.id,
              intentId: intent.id,
              stepIndex: step.stepIndex,
              hopCount: plan.hopCount,
            },
          },
          () =>
            adapter.execute({
              intentId: intent.id,
              walletId: intent.walletId,
              mode,
              step,
              intentMetadata: intent.metadata as Record<string, unknown> | undefined,
              extensions: Object.keys(extensions).length ? extensions : undefined,
            })
        );
        if (!res.success) {
          const failedExec = await withDatabaseTransaction(db, async (txDb) => {
            const insertedExecution = await executionRepo.insertExecution(txDb, {
              intentId: intent.id,
              adapterId: adapter.id,
              status: 'failed',
              payload: {
                ...(res as unknown as Record<string, unknown>),
                ...executionPolicyPackFields,
                stepIndex: step.stepIndex,
                hopCount: plan.hopCount,
              },
              lifecycleState: 'failed',
              startedAt: execStartedAt,
              settlementLatencyMs: Date.now() - execStartedAt.getTime(),
              lastJobId: job.id,
              lastJobError: 'adapter returned failure',
            });
            await transitionIntent(txDb, intentId, currentIntentStatus, 'failed');
            await auditRepo.insertAuditEvent(txDb, {
              intentId,
              executionId: insertedExecution?.id,
              eventType: 'execution.failed',
              payload: {
                ...(res as unknown as Record<string, unknown>),
                adapterId: adapter.id,
                ...executionPolicyPackFields,
                stepIndex: step.stepIndex,
                hopCount: plan.hopCount,
              },
              correlationId: job.id,
            });
            return insertedExecution;
          });
          void telemetryRepo
            .insertTelemetryBatch(db, [
              {
                name: 'operator.execution_outcome',
                payload: {
                  adapterId: adapter.id,
                  corridorKey: `${intent.baseAsset}:${intent.quoteAsset}`,
                  success: false,
                  stepIndex: step.stepIndex,
                  hopCount: plan.hopCount,
                  executionId: failedExec?.id,
                },
              },
            ])
            .catch((e) => log.warn({ err: e }, 'operator outcome telemetry insert failed'));
          return;
        }
        const data = res.data;
        const settlementLatencyMs = Date.now() - execStartedAt.getTime();
        const rowInsert = executionToRow(intent.id, adapter.id, {
          ...data,
          ...executionPolicyPackFields,
        });
        const executionPayload = {
          ...rowInsert.payload,
          stepIndex: step.stepIndex,
          hopCount: plan.hopCount,
        };
        const inserted = await withDatabaseTransaction(db, async (txDb) => {
          const insertedExecution = await executionRepo.insertExecution(txDb, {
            ...rowInsert,
            payload: executionPayload,
            startedAt: execStartedAt,
            settlementLatencyMs,
            lastJobId: job.id,
          });
          if (isExecutionFailure(data)) {
            await transitionIntent(txDb, intentId, currentIntentStatus, 'failed');
            await auditRepo.insertAuditEvent(txDb, {
              intentId,
              executionId: insertedExecution?.id,
              eventType: 'execution.failed',
              payload: {
                executionId: insertedExecution?.id,
                adapterId: adapter.id,
                status: data.status,
                settlementState: data.settlementState,
                ...executionPolicyPackFields,
                stepIndex: step.stepIndex,
                hopCount: plan.hopCount,
              },
              correlationId: job.id,
            });
          } else {
            await auditRepo.insertAuditEvent(txDb, {
              intentId,
              executionId: insertedExecution?.id,
              eventType: 'execution.step_completed',
              payload: {
                executionId: insertedExecution?.id,
                adapterId: adapter.id,
                status: data.status,
                settlementState: data.settlementState,
                ...executionPolicyPackFields,
                stepIndex: step.stepIndex,
                hopCount: plan.hopCount,
              },
              correlationId: job.id,
            });
          }
          return insertedExecution;
        });
        lastExecutionId = inserted?.id;
        lastReceiptRef = inserted?.id ?? data.txId ?? lastReceiptRef;
        if (isExecutionFailure(data)) {
          void telemetryRepo
            .insertTelemetryBatch(db, [
              {
                name: 'operator.execution_outcome',
                payload: {
                  adapterId: adapter.id,
                  corridorKey: `${intent.baseAsset}:${intent.quoteAsset}`,
                  success: false,
                  settlementLatencyMs,
                  stepIndex: step.stepIndex,
                  hopCount: plan.hopCount,
                  executionId: inserted?.id,
                },
              },
            ])
            .catch((e) => log.warn({ err: e }, 'operator outcome telemetry insert failed'));
          return;
        }
        const expectedSlippageBps = step.quote?.expectedSlippageBps;
        void telemetryRepo
          .insertTelemetryBatch(db, [
            {
              name: 'operator.execution_outcome',
              payload: {
                adapterId: adapter.id,
                corridorKey: `${intent.baseAsset}:${intent.quoteAsset}`,
                success: true,
                settlementLatencyMs,
                ...(typeof expectedSlippageBps === 'number' ? { expectedSlippageBps } : {}),
                stepIndex: step.stepIndex,
                hopCount: plan.hopCount,
                executionId: inserted?.id,
              },
            },
            ])
            .catch((e) => log.warn({ err: e }, 'operator outcome telemetry insert failed'));
      }
      await withDatabaseTransaction(db, async (txDb) => {
        await transitionIntent(txDb, intentId, currentIntentStatus, 'executed');
        await auditRepo.insertAuditEvent(txDb, {
          intentId,
          executionId: lastExecutionId,
          eventType: 'execution.completed',
          payload: {
            executionId: lastExecutionId,
            ...executionPolicyPackFields,
            hopCount: plan.hopCount,
            stepCount: plan.steps.length,
          },
          correlationId: job.id,
        });
      });
      try {
        const intentHash = createHash('sha256')
          .update(JSON.stringify({ id: intent.id, createdAt: intent.createdAt }))
          .digest('hex');
        const latestPolicySnapshot = await snapshotRepo.getLatestPolicySnapshotForIntent(db, intent.id);
        await journalRepo
          .createVerifiableExecutionJournal(db, { intentId: intent.id, executionId: lastExecutionId })
          .appendEntry({
            intentHash,
            policyVersion: latestPolicySnapshot?.policyConfigHash ?? policyVersionHash(policyCfg, null),
            routeId: plan.id,
            receiptRef: lastReceiptRef ?? 'unknown',
          });
      } catch (e) {
        log.error({ err: e, intentId }, 'execution journal append failed');
      }
        }
      ),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.executionProcessing) }
  );
  workers.push(execWorker);

  execWorker.on('failed', (job, err) => {
    if (!job?.data?.intentId) return;
    const attempts = job.opts.attempts ?? 1;
    if (!(err instanceof UnrecoverableError) && job.attemptsMade < attempts) return;
    const intentId = job.data.intentId as string;
    const errorText = errorMessage(err);
    void jobFailureRepo
      .insertJobFailure(db, {
        intentId,
        queueName: QUEUE_NAMES.executionProcessing,
        jobId: job.id,
        errorText,
        payload: { data: job.data },
      })
      .catch((e) => log.error({ err: e }, 'jobFailures insert failed'));
    void (async () => {
      const intent = await intentRepo.getIntentById(db, intentId);
      const ex = await executionRepo.getLatestExecutionForIntent(db, intentId);
      await withDatabaseTransaction(db, async (txDb) => {
        if (intent && intent.status !== 'failed' && canTransitionIntentStatus(intent.status, 'failed')) {
          await intentRepo.updateIntentStatus(txDb, intentId, 'failed');
        }
        await auditRepo.insertAuditEvent(txDb, {
          intentId,
          eventType: 'execution.job_failed',
          payload: {
            queueName: QUEUE_NAMES.executionProcessing,
            error: errorText,
          },
          correlationId: job.id ? String(job.id) : undefined,
        });
        if (ex?.id) {
          await executionRepo.patchExecutionJobMeta(txDb, ex.id, {
            lastJobError: errorText,
            lastJobId: job.id,
          });
        }
      });
    })().catch(() => undefined);
    void deadLetterQueue
      .add(
        'failed',
        { sourceQueue: QUEUE_NAMES.executionProcessing, intentId, err: String(err) },
        { jobId: `dlq-${job.id}` }
      )
      .catch(() => undefined);
  });

  const simWorker = new Worker(
    QUEUE_NAMES.simulationRuns,
    async (job) =>
      withQueueJobSpan(
        QUEUE_NAMES.simulationRuns,
        job,
        {
          intentId: typeof job.data?.intentId === 'string' ? job.data.intentId : undefined,
          routePlanId: typeof job.data?.routePlanId === 'string' ? job.data.routePlanId : undefined,
        },
        async () => {
      const { intentId, routePlanId, scenario: rawScenario } = job.data as {
        intentId: string;
        routePlanId: string;
        scenario?: Record<string, unknown>;
      };
      const intentRow = await intentRepo.getIntentById(db, intentId);
      if (!intentRow) throw new Error('Intent not found');
      const intent = ExecutionIntentSchema.parse(intentRow.payload);
      const routeRow = await routeRepo.getRoutePlanById(db, routePlanId);
      if (!routeRow) throw new Error('Route plan not found');
      if (routeRow.intentId !== intentId) {
        throw new Error('Route plan does not belong to intent');
      }
      const plan = RoutePlanSchema.parse(routeRow.payload);
      const scenario = SimulationScenarioSchema.parse(rawScenario ?? {});
      const keetaSnapshot = await buildKeetaSimulationSnapshot(env, db, intent, scenario);
      const run = await simulationRepo.insertSimulationRun(db, {
        intentId: intent.id,
        routePlanId: plan.id,
        status: 'running',
        scenario: scenario as unknown as Record<string, unknown>,
      });
      if (!run) throw new Error('Simulation run insert failed');
      try {
        const result = await withSpan(
          'worker.simulation.run',
          {
            tracerName: 'keeta-agent-worker',
            attributes: {
              intentId: intent.id,
              routePlanId: plan.id,
              fidelityMode: scenario.fidelityMode,
            },
          },
          () => simulate(intent, plan, scenario, keetaSnapshot)
        );
        await simulationRepo.updateSimulationRunStatus(db, run.id, 'completed');
        await simulationRepo.insertSimulationResult(db, {
          runId: run.id,
          payload: result as unknown as Record<string, unknown>,
        });
      } catch (error) {
        await simulationRepo.updateSimulationRunStatus(db, run.id, 'failed');
        await auditRepo.insertAuditEvent(db, {
          intentId: intent.id,
          eventType: 'simulation.failed',
          payload: {
            routePlanId: plan.id,
            message: error instanceof Error ? error.message : String(error),
          },
          correlationId: job.id,
        });
      }
        }
      ),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.simulationRuns) }
  );
  workers.push(simWorker);

  const telemetryWorker = new Worker(
    QUEUE_NAMES.telemetryFlush,
    async (job) => {
      const batch = job.data.batch as { name: string; payload: Record<string, unknown> }[];
      if (!batch?.length) return;
      await telemetryRepo.insertTelemetryBatch(
        db,
        batch.map((b) => ({ name: b.name, payload: b.payload }))
      );
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.telemetryFlush) }
  );
  workers.push(telemetryWorker);

  const deadLetterWorker = new Worker(
    QUEUE_NAMES.deadLetter,
    async (job) => {
      log.warn({ jobId: job.id, data: job.data }, 'Dead-letter job recorded');
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.deadLetter) }
  );
  workers.push(deadLetterWorker);

  const anchorBondReconcileWorker = new Worker(
    QUEUE_NAMES.anchorBondReconciliation,
    async (job) => {
      const summary = await runAnchorBondReconciliation(
        db,
        env,
        anchorBondVerifier,
        (job.data ?? {}) as AnchorBondReconciliationJobData
      );
      await telemetryRepo.insertTelemetryBatch(db, [
        {
          name: 'anchor_bond.reconciliation',
          payload: {
            ...summary,
            reason: (job.data as AnchorBondReconciliationJobData | undefined)?.reason ?? 'scheduled',
          },
        },
      ]);
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.anchorBondReconciliation) }
  );
  workers.push(anchorBondReconcileWorker);

  const anchorOnboardingWorker = new Worker(
    QUEUE_NAMES.anchorOnboarding,
    async (job) => {
      const summary = await runAnchorOnboarding(
        db,
        env,
        anchorBondVerifier,
        (job.data ?? {}) as AnchorOnboardingJobData
      );
      await telemetryRepo.insertTelemetryBatch(db, [
        {
          name: 'anchor.onboarding',
          payload: {
            ...summary,
            reason: (job.data as AnchorOnboardingJobData | undefined)?.reason ?? 'manual',
          },
        },
      ]);
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.anchorOnboarding) }
  );
  workers.push(anchorOnboardingWorker);

  const reconcileWorker = new Worker(
    QUEUE_NAMES.executionReconciliation,
    async () => {
      const rows = await executionRepo.listExecutionsForReconciliation(db, 300_000, 30);
      if (rows.length === 0) return;
      const health = await readChainHealth(env.KEETA_NETWORK).catch(() => null);
      const ledgerBlockCount = health?.ledger?.blockCount;
      await Promise.all(
        rows.map((ex) =>
          auditRepo.insertAuditEvent(db, {
            intentId: ex.intentId,
            executionId: ex.id,
            eventType: 'execution.reconciliation_tick',
            payload: {
              settlementState: ex.settlementState,
              ledgerBlockCount,
            },
          })
        )
      );
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.executionReconciliation) }
  );
  workers.push(reconcileWorker);

  const metricsWorker = new Worker(
    QUEUE_NAMES.metricsSampler,
    async () => {
      for (const q of queuesForMetrics) {
        const counts = await q.getJobCounts();
        const depth = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
        await metricsRepo.insertMetricSample(db, {
          name: 'metric.queue_depth',
          labels: { queue: q.name },
          value: depth,
        });
        await metricsRepo.insertMetricSample(db, {
          name: 'metric.queue_failed',
          labels: { queue: q.name },
          value: counts.failed ?? 0,
        });
      }
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.metricsSampler) }
  );
  workers.push(metricsWorker);

  const stuckWorker = new Worker(
    QUEUE_NAMES.stuckJobSweep,
    async (job) => {
      const ageMs = Number(job.data?.ageMs ?? env.STUCK_JOB_AGE_MS);
      const threshold = Date.now() - ageMs;
      for (const q of queuesForMetrics) {
        const batches = await Promise.all([q.getWaiting(0, 50), q.getActive(0, 50), q.getDelayed(0, 50)]);
        const flat = batches.flat();
        for (const j of flat) {
          const ts = j.timestamp ?? 0;
          if (ts < threshold) {
            await telemetryRepo.insertTelemetryBatch(db, [
              {
                name: 'job.stale_detected',
                payload: { queue: q.name, jobId: j.id, ageMs: Date.now() - ts },
              },
            ]);
          }
        }
      }
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.stuckJobSweep) }
  );
  workers.push(stuckWorker);

  const operatorMetricsWorker = new Worker(
    QUEUE_NAMES.operatorMetricsAggregation,
    async () => {
      const aggregates = await operatorMetricsRepo.aggregateOutcomesByAdapter(db);
      const unsettledByAdapter = await operatorMetricsRepo.countUnsettledByAdapter(db);
      const now = new Date();
      let samplesWritten = 0;

      for (const row of aggregates) {
        const labels = { adapterId: row.adapterId, corridorKey: row.corridorKey };
        await metricsRepo.insertMetricSample(db, {
          name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.successRate,
          labels,
          value: row.successRate,
          capturedAt: now,
        });
        samplesWritten++;
        if (row.p50LatencyMs !== null) {
          await metricsRepo.insertMetricSample(db, {
            name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.p50LatencyMs,
            labels,
            value: row.p50LatencyMs,
            capturedAt: now,
          });
          samplesWritten++;
        }
        if (row.p95LatencyMs !== null) {
          await metricsRepo.insertMetricSample(db, {
            name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.p95LatencyMs,
            labels,
            value: row.p95LatencyMs,
            capturedAt: now,
          });
          samplesWritten++;
        }
      }

      const uniqueAdapters = new Set([
        ...aggregates.map((r) => r.adapterId),
        ...unsettledByAdapter.keys(),
      ]);
      for (const adapterId of uniqueAdapters) {
        const count = unsettledByAdapter.get(adapterId) ?? 0;
        await metricsRepo.insertMetricSample(db, {
          name: operatorMetricsRepo.OPERATOR_METRIC_NAMES.unsettledVolume,
          labels: { adapterId },
          value: count,
          capturedAt: now,
        });
        samplesWritten++;
      }

      log.info({ adaptersProcessed: uniqueAdapters.size, samplesWritten }, 'operator metrics aggregated');
      // Invalidate Redis cache so the next routing decision picks up fresh data
      await Promise.all(
        [...uniqueAdapters].map((adapterId) =>
          operatorMetrics.invalidate(adapterId).catch(() => undefined)
        )
      );
    },
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.operatorMetricsAggregation) }
  );
  workers.push(operatorMetricsWorker);

  const webhookEventWorker = new Worker(
    QUEUE_NAMES.webhookEventDelivery,
    async (job) =>
      withQueueJobSpan(QUEUE_NAMES.webhookEventDelivery, job, {}, async () => {
      const batchSize = env.WEBHOOK_DELIVERY_BATCH_SIZE;
      const cursorSetting = await settingsRepo.getSetting(db, WEBHOOK_EVENT_CURSOR_KEY);
      const afterCreatedAt =
        typeof cursorSetting?.value?.afterCreatedAt === 'string' ? cursorSetting.value.afterCreatedAt : undefined;
      const since = afterCreatedAt ? new Date(afterCreatedAt) : new Date(0);
      const [freshAuditRows, freshAnchorRows] = await Promise.all([
        auditRepo.listAuditEventsSince(db, since, batchSize),
        paymentAnchorRepo.listAnchorEventsSince(db, since, batchSize),
      ]);
      const freshEvents = sortWebhookEvents([
        ...freshAuditRows.map((row) => ({
          id: row.id,
          source: 'audit' as const,
          eventType: row.eventType,
          intentId: row.intentId,
          executionId: row.executionId ?? undefined,
          payload: row.payload,
          correlationId: row.correlationId ?? undefined,
          createdAt: row.createdAt,
        })),
        ...freshAnchorRows.map((row) => ({
          id: row.id,
          source: 'anchor' as const,
          eventType: row.eventType,
          paymentAnchorId: row.paymentAnchorId,
          payload: row.payload,
          createdAt: row.createdAt,
        })),
      ]).slice(0, batchSize);
      const subscriptions = await webhookRepo.listActiveWebhookSubscriptions(db);
      let newestCreatedAt: Date | undefined;

      for (const event of freshEvents) {
        newestCreatedAt = event.createdAt;
        for (const subscription of subscriptions) {
          if (!matchesWebhookEventType(subscription.eventTypes, event.eventType)) continue;
          await webhookRepo.insertWebhookDelivery(db, {
            subscriptionId: subscription.id,
            auditEventId: event.id,
            eventSource: event.source,
            status: 'pending',
            attemptCount: 0,
            nextAttemptAt: new Date(),
            createdAt: new Date(),
            updatedAt: new Date(),
          });
        }
      }

      if (newestCreatedAt) {
        await settingsRepo.upsertSetting(db, WEBHOOK_EVENT_CURSOR_KEY, {
          afterCreatedAt: newestCreatedAt.toISOString(),
        });
      }

      const dueDeliveries = await webhookRepo.listDueWebhookDeliveries(db, batchSize);
      for (const delivery of dueDeliveries) {
        const subscription = await webhookRepo.getWebhookSubscriptionById(db, delivery.subscriptionId);
        const eventSource = normalizeWebhookEventSource(delivery.eventSource);
        const event =
          eventSource === 'anchor'
            ? await paymentAnchorRepo.getAnchorEventById(db, delivery.auditEventId)
            : await auditRepo.getAuditEventById(db, delivery.auditEventId);
        if (!subscription || !event) {
          await webhookRepo.markWebhookDeliveryFailed(db, delivery.id, {
            attemptCount: delivery.attemptCount + 1,
            lastError: 'Webhook subscription or event missing',
            nextAttemptAt: null,
          });
          continue;
        }
        if (subscription.status !== 'active') {
          await webhookRepo.markWebhookDeliveryFailed(db, delivery.id, {
            attemptCount: delivery.attemptCount + 1,
            lastError: 'Webhook subscription is not active',
            nextAttemptAt: null,
          });
          continue;
        }

        const body = JSON.stringify(
          serializeWebhookEventPayload({
            id: event.id,
            source: eventSource,
            eventType: event.eventType,
            intentId:
              'intentId' in event && event.intentId ? event.intentId : undefined,
            paymentAnchorId:
              'paymentAnchorId' in event && event.paymentAnchorId ? event.paymentAnchorId : undefined,
            executionId:
              'executionId' in event && event.executionId ? event.executionId : undefined,
            payload: event.payload,
            correlationId: 'correlationId' in event ? optionalString(event.correlationId) : undefined,
            createdAt: event.createdAt,
          })
        );
        const payload = serializeWebhookEventPayload({
          id: event.id,
          source: eventSource,
          eventType: event.eventType,
          intentId:
            'intentId' in event && event.intentId ? event.intentId : undefined,
          paymentAnchorId:
            'paymentAnchorId' in event && event.paymentAnchorId ? event.paymentAnchorId : undefined,
          executionId:
            'executionId' in event && event.executionId ? event.executionId : undefined,
          payload: event.payload,
          correlationId: 'correlationId' in event ? optionalString(event.correlationId) : undefined,
          createdAt: event.createdAt,
        });
        const headers: Record<string, string> = {
          'content-type': 'application/json',
          'user-agent': 'keeta-agent-sdk/webhook-delivery',
          'x-keeta-event-type': payload.eventType,
          'x-keeta-delivery-id': delivery.id,
        };
        if (subscription.secret) {
          headers['x-keeta-signature'] = createHmac('sha256', subscription.secret).update(body).digest('hex');
        }

        try {
          const response = await withSpan(
            'worker.webhook.delivery',
            {
              tracerName: 'keeta-agent-worker',
              kind: 'client',
              attributes: {
                subscriptionId: subscription.id,
                deliveryId: delivery.id,
                eventType: payload.eventType,
                eventSource,
                targetUrl: subscription.targetUrl,
              },
            },
            () =>
              fetch(subscription.targetUrl, {
                method: 'POST',
                headers,
                body,
                signal: AbortSignal.timeout(10_000),
              })
          );
          const responseBody = await response.text().catch(() => '');
          const attemptCount = delivery.attemptCount + 1;
          if (response.ok) {
            await webhookRepo.markWebhookDeliveryDelivered(db, delivery.id, {
              attemptCount,
              responseStatus: response.status,
              responseBody: responseBody.slice(0, 2_000),
            });
          } else {
            await webhookRepo.markWebhookDeliveryFailed(db, delivery.id, {
              ...webhookRetryFailure(attemptCount, env.WEBHOOK_DELIVERY_MAX_ATTEMPTS, {
                responseStatus: response.status,
                responseBody: responseBody.slice(0, 2_000),
                lastError: `Webhook returned ${response.status}`,
              }),
            });
          }
        } catch (error) {
          const attemptCount = delivery.attemptCount + 1;
          await webhookRepo.markWebhookDeliveryFailed(db, delivery.id, {
            ...webhookRetryFailure(attemptCount, env.WEBHOOK_DELIVERY_MAX_ATTEMPTS, {
              lastError: errorMessage(error),
            }),
          });
        }
      }
      }),
    { ...connection, ...getWorkerOptions(QUEUE_NAMES.webhookEventDelivery) }
  );
  workers.push(webhookEventWorker);

  const reconcileQueue = new Queue(QUEUE_NAMES.executionReconciliation, connection);
  const anchorBondReconcileQueue = new Queue(QUEUE_NAMES.anchorBondReconciliation, connection);
  const anchorOnboardingQueue = new Queue(QUEUE_NAMES.anchorOnboarding, connection);
  const metricsQueue = new Queue(QUEUE_NAMES.metricsSampler, connection);
  const stuckQueue = new Queue(QUEUE_NAMES.stuckJobSweep, connection);
  const operatorMetricsQueue = new Queue(QUEUE_NAMES.operatorMetricsAggregation, connection);
  const webhookEventQueue = new Queue(QUEUE_NAMES.webhookEventDelivery, connection);

  await anchorBondReconcileQueue.add(
    'tick',
    { reason: 'scheduled' } satisfies AnchorBondReconciliationJobData,
    {
      repeat: { every: env.ANCHOR_BOND_RECONCILE_INTERVAL_MS },
      jobId: 'repeat-anchor-bond-reconcile',
    }
  );
  await reconcileQueue.add(
    'tick',
    {},
    {
      repeat: { every: env.RECONCILE_INTERVAL_MS },
      jobId: 'repeat-reconcile',
    }
  );
  await metricsQueue.add(
    'sample',
    {},
    {
      repeat: { every: env.METRICS_INTERVAL_MS },
      jobId: 'repeat-metrics',
    }
  );
  await stuckQueue.add(
    'sweep',
    { ageMs: env.STUCK_JOB_AGE_MS },
    {
      repeat: { every: env.STUCK_JOB_SWEEP_INTERVAL_MS },
      jobId: 'repeat-stuck',
    }
  );
  await operatorMetricsQueue.add(
    'aggregate',
    {},
    {
      repeat: { every: env.OPERATOR_METRICS_INTERVAL_MS },
      jobId: 'repeat-operator-metrics',
    }
  );
  await webhookEventQueue.add(
    'deliver',
    {},
    {
      repeat: { every: env.WEBHOOK_DELIVERY_INTERVAL_MS },
      jobId: 'repeat-webhook-delivery',
    }
  );

  log.info('Workers started');

  return async function shutdown() {
    const timeoutMs = env.WORKER_SHUTDOWN_TIMEOUT_MS;
    for (const w of workers) {
      await closeWithTimeout(`worker:${w.name}`, timeoutMs, () => w.close());
    }
    for (const q of queuesForMetrics) {
      await closeWithTimeout(`queue:${q.name}`, timeoutMs, () => q.close());
    }
    await closeWithTimeout(`queue:${anchorOnboardingQueue.name}`, timeoutMs, () => anchorOnboardingQueue.close());
    await closeWithTimeout(`queue:${anchorBondReconcileQueue.name}`, timeoutMs, () => anchorBondReconcileQueue.close());
    await closeWithTimeout(`queue:${reconcileQueue.name}`, timeoutMs, () => reconcileQueue.close());
    await closeWithTimeout(`queue:${metricsQueue.name}`, timeoutMs, () => metricsQueue.close());
    await closeWithTimeout(`queue:${stuckQueue.name}`, timeoutMs, () => stuckQueue.close());
    await closeWithTimeout(`queue:${operatorMetricsQueue.name}`, timeoutMs, () => operatorMetricsQueue.close());
    await closeWithTimeout(`queue:${webhookEventQueue.name}`, timeoutMs, () => webhookEventQueue.close());
    await closeWithTimeout(`queue:${deadLetterQueue.name}`, timeoutMs, () => deadLetterQueue.close());
    signingUserClient?.destroy?.();
    await closeWithTimeout('redis', timeoutMs, () => redis.quit());
    await closeWithTimeout('database', timeoutMs, () => db.pool.end());
    await closeWithTimeout('tracing', timeoutMs, () => shutdownTracing());
  };
}
