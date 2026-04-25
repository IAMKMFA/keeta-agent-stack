import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { QUEUE_NAMES } from '@keeta-agent-stack/config';
import {
  AnchorBondStatusSchema,
  type AnchorBondRecord,
  AnchorWithdrawalDelayDaysSchema,
  canTransitionPaymentAnchorStatus,
  evaluatePaymentAnchorOnboarding,
  evaluatePaymentAnchorReadiness,
  type PaymentAnchorOperatorMetrics,
  type PaymentAnchorSummary,
  type PaymentAnchorStatus,
  PaymentAnchorStatusSchema,
} from '@keeta-agent-stack/types';
import { operatorMetricsRepo, paymentAnchorRepo } from '@keeta-agent-stack/storage';
import { enqueueJobWithTelemetry } from '../lib/job-tracing.js';
import { requireOperatorAccess, requireViewerAccess } from '../lib/auth.js';

function toIso(value: Date | string | null | undefined): string | undefined {
  if (!value) return undefined;
  return value instanceof Date ? value.toISOString() : value;
}

async function toAnchorResponse(
  db: Parameters<typeof paymentAnchorRepo.getPaymentAnchor>[0],
  row: Awaited<ReturnType<typeof paymentAnchorRepo.getPaymentAnchor>>,
  strictBondVerification = false
) {
  if (!row) return null;
  const bond = await paymentAnchorRepo.getLatestAnchorBondForAnchor(db, row.id);
  const currentBond: AnchorBondRecord | undefined = bond
    ? {
        id: bond.id,
        paymentAnchorId: bond.paymentAnchorId,
        amountAtomic: bond.amountAtomic,
        assetId: bond.assetId,
        delayDays: AnchorWithdrawalDelayDaysSchema.parse(bond.delayDays),
        status: AnchorBondStatusSchema.parse(bond.status),
        lockTxHash: bond.lockTxHash ?? undefined,
        lockAccount: bond.lockAccount ?? undefined,
        withdrawalRequestedAt: toIso(bond.withdrawalRequestedAt),
        activatedAt: toIso(bond.activatedAt),
        releasedAt: toIso(bond.releasedAt),
        verified: bond.verified,
        verificationSource:
          bond.verificationSource === 'database' || bond.verificationSource === 'keeta'
            ? bond.verificationSource
            : undefined,
        verificationDetails: bond.verificationDetails ?? undefined,
        createdAt: toIso(bond.createdAt)!,
        updatedAt: toIso(bond.updatedAt)!,
      }
    : undefined;
  const response: Omit<PaymentAnchorSummary, 'readiness' | 'onboarding'> = {
    id: row.id,
    adapterId: row.adapterId,
    label: row.label,
    status: PaymentAnchorStatusSchema.parse(row.status) as PaymentAnchorStatus,
    corridorKey: row.corridorKey ?? undefined,
    operatorRef: row.operatorRef ?? undefined,
    publicLabel: row.publicLabel,
    corridorConfig: row.corridorConfig ?? {},
    supportedAssets: row.supportedAssets ?? [],
    commercialTerms: row.commercialTerms ?? {},
    metadata: row.metadata ?? {},
    createdAt: toIso(row.createdAt)!,
    updatedAt: toIso(row.updatedAt)!,
    currentBond,
  };
  const operatorMetricsSnapshot = await operatorMetricsRepo.getOperatorMetricsSnapshot(
    db,
    row.adapterId,
    row.corridorKey ?? undefined
  );
  const operatorMetrics: PaymentAnchorOperatorMetrics | undefined = Object.values(
    operatorMetricsSnapshot
  ).some((value) => value !== undefined)
    ? {
        successRate: operatorMetricsSnapshot.successRate,
        p50LatencyMs: operatorMetricsSnapshot.p50LatencyMs,
        p95LatencyMs: operatorMetricsSnapshot.p95LatencyMs,
        unsettledVolume: operatorMetricsSnapshot.unsettledVolume,
        bondAgeDays: operatorMetricsSnapshot.bondAgeDays,
        bondVerified: operatorMetricsSnapshot.bondVerified,
        sampledAt: toIso(operatorMetricsSnapshot.sampledAt),
      }
    : undefined;
  return {
    ...response,
    readiness: evaluatePaymentAnchorReadiness(response, { strictBondVerification }),
    onboarding: evaluatePaymentAnchorOnboarding(response, { strictBondVerification }),
    operatorMetrics,
  };
}

const createAnchorBody = z.object({
  adapterId: z.string().min(1),
  label: z.string().min(1),
  status: PaymentAnchorStatusSchema.default('draft'),
  corridorKey: z.string().optional(),
  operatorRef: z.string().optional(),
  publicLabel: z.boolean().default(true),
  corridorConfig: z.record(z.unknown()).default({}),
  supportedAssets: z.array(z.string().min(1)).default([]),
  commercialTerms: z
    .object({
      setupFeeNote: z.string().optional(),
      volumeFeeBps: z.number().nonnegative().optional(),
    })
    .default({}),
  metadata: z.record(z.unknown()).default({}),
});

const patchAnchorBody = createAnchorBody
  .partial()
  .refine((value) => Object.keys(value).length > 0, {
    message: 'At least one field is required',
  });

const patchBondBody = z.object({
  amountAtomic: z.string().min(1),
  assetId: z.string().min(1).default('KTA'),
  delayDays: AnchorWithdrawalDelayDaysSchema,
  status: AnchorBondStatusSchema,
  lockTxHash: z.string().optional(),
  lockAccount: z.string().optional(),
  withdrawalRequestedAt: z.string().datetime().optional(),
  activatedAt: z.string().datetime().optional(),
  releasedAt: z.string().datetime().optional(),
  verified: z.boolean().optional(),
  verificationSource: z.enum(['database', 'keeta']).optional(),
  verificationDetails: z.record(z.unknown()).optional(),
});

const reconcileAnchorsBody = z.object({
  paymentAnchorId: z.string().uuid().optional(),
  adapterId: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
});

const onboardingAnchorsBody = z.object({
  paymentAnchorId: z.string().uuid().optional(),
  adapterId: z.string().min(1).optional(),
  reason: z.string().min(1).optional(),
  reconcileBond: z.boolean().optional(),
});

export const anchorsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/anchors', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const rows = await paymentAnchorRepo.listPaymentAnchors(app.db, 200);
    const anchors = await Promise.all(
      rows.map((row) => toAnchorResponse(app.db, row, app.env.ANCHOR_BOND_STRICT === true))
    );
    return anchors.filter((anchor) => anchor !== null);
  });

  /**
   * Dashboard-safe anchor health aggregate. Does not return full anchor
   * configuration; returns only health signals that are safe to surface to
   * operator / exec viewers.
   */
  app.get('/anchors/health', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const rows = await paymentAnchorRepo.listPaymentAnchors(app.db, 500);
    const strict = app.env.ANCHOR_BOND_STRICT === true;
    const anchors = (
      await Promise.all(rows.map((row) => toAnchorResponse(app.db, row, strict)))
    ).filter((a): a is NonNullable<typeof a> => a !== null);

    const total = anchors.length;
    let bonded = 0;
    let verified = 0;
    let withdrawalRequested = 0;
    let notReady = 0;
    const statusCounts: Record<string, number> = {};

    const items = anchors.map((anchor) => {
      const bond = anchor.currentBond;
      const hasBond = !!bond;
      const isBonded = hasBond && bond!.status !== 'released';
      const isVerified = hasBond && bond!.verified === true;
      const isWithdrawing = hasBond && !!bond!.withdrawalRequestedAt && bond!.status !== 'released';
      if (isBonded) bonded += 1;
      if (isVerified) verified += 1;
      if (isWithdrawing) withdrawalRequested += 1;
      if (anchor.readiness?.status !== 'ready') notReady += 1;
      statusCounts[anchor.status] = (statusCounts[anchor.status] ?? 0) + 1;

      return {
        id: anchor.id,
        label: anchor.label,
        adapterId: anchor.adapterId,
        status: anchor.status,
        corridorKey: anchor.corridorKey,
        ready: anchor.readiness?.status === 'ready',
        readinessStatus: anchor.readiness?.status ?? 'blocked',
        canServeLiveTraffic: anchor.readiness?.canServeLiveTraffic ?? false,
        bond: hasBond
          ? {
              amountAtomic: bond!.amountAtomic,
              assetId: bond!.assetId,
              status: bond!.status,
              delayDays: bond!.delayDays,
              verified: bond!.verified,
              withdrawalRequestedAt: bond!.withdrawalRequestedAt,
              ageDays: bond!.createdAt
                ? Math.max(0, Math.floor((Date.now() - Date.parse(bond!.createdAt)) / 86_400_000))
                : null,
            }
          : null,
        operatorMetrics: anchor.operatorMetrics ?? null,
      };
    });

    return {
      summary: {
        total,
        bonded,
        verified,
        withdrawalRequested,
        notReady,
        statusCounts,
        bondCoverage: total > 0 ? Math.round((bonded / total) * 1000) / 10 : 0,
        verificationRate: bonded > 0 ? Math.round((verified / bonded) * 1000) / 10 : 0,
        strictVerification: strict,
      },
      anchors: items,
    };
  });

  app.post('/anchors/reconcile', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = reconcileAnchorsBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: app.queues[QUEUE_NAMES.anchorBondReconciliation]!,
      jobName: 'reconcile',
      data: {
        ...parsed.data,
        reason: parsed.data.reason ?? 'manual_api',
      },
      jobOptions: {
        jobId: parsed.data.paymentAnchorId
          ? `anchor-bond-reconcile-${parsed.data.paymentAnchorId}-${Date.now()}`
          : `anchor-bond-reconcile-all-${Date.now()}`,
      },
      spanName: 'api.anchor.reconcile.enqueue',
      attributes: {
        paymentAnchorId: parsed.data.paymentAnchorId,
        adapterId: parsed.data.adapterId,
      },
    });
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.anchorBondReconciliation,
    });
  });

  app.post('/anchors/onboarding/run', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = onboardingAnchorsBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: app.queues[QUEUE_NAMES.anchorOnboarding]!,
      jobName: 'run',
      data: {
        ...parsed.data,
        reason: parsed.data.reason ?? 'manual_api',
        reconcileBond: parsed.data.reconcileBond ?? true,
      },
      jobOptions: {
        jobId: parsed.data.paymentAnchorId
          ? `anchor-onboarding-${parsed.data.paymentAnchorId}-${Date.now()}`
          : `anchor-onboarding-all-${Date.now()}`,
      },
      spanName: 'api.anchor.onboarding.enqueue',
      attributes: {
        paymentAnchorId: parsed.data.paymentAnchorId,
        adapterId: parsed.data.adapterId,
      },
    });
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.anchorOnboarding,
    });
  });

  app.get('/anchors/:id', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await paymentAnchorRepo.getPaymentAnchor(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    const anchor = await toAnchorResponse(app.db, row, app.env.ANCHOR_BOND_STRICT === true);
    const events = await paymentAnchorRepo.listAnchorEvents(app.db, id, 20);
    return {
      ...anchor!,
      events: events.map((event) => ({
        id: event.id,
        paymentAnchorId: event.paymentAnchorId,
        anchorBondId: event.anchorBondId ?? undefined,
        eventType: event.eventType,
        payload: event.payload ?? {},
        createdAt: toIso(event.createdAt)!,
      })),
    };
  });

  app.post('/anchors/:id/reconcile', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await paymentAnchorRepo.getPaymentAnchor(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: app.queues[QUEUE_NAMES.anchorBondReconciliation]!,
      jobName: 'reconcile-one',
      data: {
        paymentAnchorId: id,
        adapterId: row.adapterId,
        reason: 'manual_api_single',
      },
      jobOptions: {
        jobId: `anchor-bond-reconcile-${id}-${Date.now()}`,
      },
      spanName: 'api.anchor.reconcile-one.enqueue',
      attributes: {
        paymentAnchorId: id,
        adapterId: row.adapterId,
      },
    });
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.anchorBondReconciliation,
      paymentAnchorId: id,
    });
  });

  app.post('/anchors/:id/onboarding/run', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await paymentAnchorRepo.getPaymentAnchor(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    const parsed = z
      .object({ reason: z.string().min(1).optional(), reconcileBond: z.boolean().optional() })
      .safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: app.queues[QUEUE_NAMES.anchorOnboarding]!,
      jobName: 'run-one',
      data: {
        paymentAnchorId: id,
        adapterId: row.adapterId,
        reason: parsed.data.reason ?? 'manual_api_single',
        reconcileBond: parsed.data.reconcileBond ?? true,
      },
      jobOptions: {
        jobId: `anchor-onboarding-${id}-${Date.now()}`,
      },
      spanName: 'api.anchor.onboarding-one.enqueue',
      attributes: {
        paymentAnchorId: id,
        adapterId: row.adapterId,
      },
    });
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.anchorOnboarding,
      paymentAnchorId: id,
    });
  });

  app.post('/anchors', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = createAnchorBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const created = await paymentAnchorRepo.insertPaymentAnchor(app.db, parsed.data);
    if (!created) {
      return reply
        .status(500)
        .send({ error: { code: 'CREATE_FAILED', message: 'Anchor was not created' } });
    }
    await paymentAnchorRepo.insertAnchorEvent(app.db, {
      paymentAnchorId: created.id,
      eventType: 'payment_anchor.created',
      payload: { adapterId: created.adapterId, status: created.status },
    });
    return reply
      .status(201)
      .send(await toAnchorResponse(app.db, created, app.env.ANCHOR_BOND_STRICT === true));
  });

  app.patch('/anchors/:id', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = patchAnchorBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const updated = await paymentAnchorRepo.updatePaymentAnchor(app.db, id, parsed.data);
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    await paymentAnchorRepo.insertAnchorEvent(app.db, {
      paymentAnchorId: id,
      eventType: 'payment_anchor.updated',
      payload: parsed.data as Record<string, unknown>,
    });
    return await toAnchorResponse(app.db, updated, app.env.ANCHOR_BOND_STRICT === true);
  });

  app.post('/anchors/:id/status', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const current = await paymentAnchorRepo.getPaymentAnchor(app.db, id);
    if (!current) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    const parsed = z.object({ status: PaymentAnchorStatusSchema }).safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    if (
      !canTransitionPaymentAnchorStatus(
        current.status as Parameters<typeof canTransitionPaymentAnchorStatus>[0],
        parsed.data.status
      )
    ) {
      return reply.status(400).send({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot move anchor from ${current.status} to ${parsed.data.status}`,
        },
      });
    }
    const currentAnchor = await toAnchorResponse(
      app.db,
      current,
      app.env.ANCHOR_BOND_STRICT === true
    );
    if (!currentAnchor) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    if (parsed.data.status === 'active' && !currentAnchor.readiness.canActivate) {
      return reply.status(400).send({
        error: {
          code: 'ACTIVATION_BLOCKED',
          message: 'Anchor cannot move to active until readiness blockers are resolved.',
          readiness: currentAnchor.readiness,
        },
      });
    }
    if (parsed.data.status === 'bond_pending_lock' && !currentAnchor.currentBond) {
      return reply.status(400).send({
        error: {
          code: 'BOND_REQUIRED',
          message: 'Create a bond record before moving the anchor to bond_pending_lock.',
        },
      });
    }
    if (
      parsed.data.status === 'withdrawal_requested' &&
      currentAnchor.currentBond?.status !== 'withdrawal_requested'
    ) {
      return reply.status(400).send({
        error: {
          code: 'BOND_WITHDRAWAL_REQUIRED',
          message: 'Update the bond to withdrawal_requested before moving the anchor lifecycle.',
        },
      });
    }
    if (parsed.data.status === 'released' && currentAnchor.currentBond?.status !== 'released') {
      return reply.status(400).send({
        error: {
          code: 'BOND_RELEASE_REQUIRED',
          message: 'Mark the bond released before moving the anchor lifecycle to released.',
        },
      });
    }
    const updated = await paymentAnchorRepo.updatePaymentAnchor(app.db, id, {
      status: parsed.data.status,
    });
    if (!updated) {
      return reply
        .status(500)
        .send({ error: { code: 'UPDATE_FAILED', message: 'Anchor status was not updated' } });
    }
    await paymentAnchorRepo.insertAnchorEvent(app.db, {
      paymentAnchorId: id,
      eventType: 'payment_anchor.status_changed',
      payload: { from: current.status, to: parsed.data.status },
    });
    return await toAnchorResponse(app.db, updated, app.env.ANCHOR_BOND_STRICT === true);
  });

  app.patch('/anchors/:id/bond', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const anchor = await paymentAnchorRepo.getPaymentAnchor(app.db, id);
    if (!anchor) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Anchor not found' } });
    }
    const parsed = patchBondBody.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const existing = await paymentAnchorRepo.getLatestAnchorBondForAnchor(app.db, id);
    const payload = {
      amountAtomic: parsed.data.amountAtomic,
      assetId: parsed.data.assetId,
      delayDays: parsed.data.delayDays,
      status: parsed.data.status,
      lockTxHash: parsed.data.lockTxHash,
      lockAccount: parsed.data.lockAccount,
      withdrawalRequestedAt: parsed.data.withdrawalRequestedAt
        ? new Date(parsed.data.withdrawalRequestedAt)
        : undefined,
      activatedAt: parsed.data.activatedAt ? new Date(parsed.data.activatedAt) : undefined,
      releasedAt: parsed.data.releasedAt ? new Date(parsed.data.releasedAt) : undefined,
      verified: parsed.data.verified ?? false,
      verificationSource: parsed.data.verificationSource,
      verificationDetails: parsed.data.verificationDetails,
    };
    const bond = existing
      ? await paymentAnchorRepo.updateAnchorBond(app.db, existing.id, payload)
      : await paymentAnchorRepo.insertAnchorBond(app.db, {
          paymentAnchorId: id,
          ...payload,
        });
    if (!bond) {
      return reply
        .status(500)
        .send({ error: { code: 'BOND_UPDATE_FAILED', message: 'Anchor bond was not saved' } });
    }
    await paymentAnchorRepo.insertAnchorEvent(app.db, {
      paymentAnchorId: id,
      anchorBondId: bond.id,
      eventType: existing ? 'payment_anchor.bond_updated' : 'payment_anchor.bond_created',
      payload: parsed.data as Record<string, unknown>,
    });
    return await toAnchorResponse(app.db, anchor, app.env.ANCHOR_BOND_STRICT === true);
  });
};
