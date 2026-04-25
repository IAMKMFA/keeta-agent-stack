import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import {
  ExecutionIntentSchema,
  canTransitionIntentStatus,
  type ExecutionIntent,
} from '@keeta-agent-stack/types';
import { intentRepo, routeRepo, auditRepo, routeOverrideRepo } from '@keeta-agent-stack/storage';
import { QUEUE_NAMES, getDefaultJobOptions } from '@keeta-agent-stack/config';
import { z } from 'zod';
import { enqueueJobWithTelemetry } from '../lib/job-tracing.js';
import { requireAdminAccess, requireOperatorAccess, requireViewerAccess } from '../lib/auth.js';

const createIntentBody = ExecutionIntentSchema.omit({
  id: true,
  createdAt: true,
  effectivePolicyPackId: true,
  effectivePolicyPackName: true,
  effectivePolicyPackSource: true,
})
  .partial({
    strategyId: true,
    policyPackId: true,
    venueAllowlist: true,
    metadata: true,
  })
  .extend({
    requiresApproval: z.boolean().optional(),
  });

const enqueuePolicyBody = z.object({
  policyPackId: z.string().uuid().optional(),
});

function policyPackIdFromIntentPayload(payload: unknown): string | undefined {
  if (!payload || typeof payload !== 'object') {
    return undefined;
  }
  const topLevel = (payload as Record<string, unknown>).policyPackId;
  if (typeof topLevel === 'string') {
    return topLevel;
  }
  const metadata = (payload as Record<string, unknown>).metadata;
  if (!metadata || typeof metadata !== 'object') {
    return undefined;
  }
  const legacy = (metadata as Record<string, unknown>).policyPackId;
  return typeof legacy === 'string' ? legacy : undefined;
}

export const intentsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/intents', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const rows = await intentRepo.listIntents(app.db, 200);
    return rows.map((row) => ({
      id: row.id,
      strategyId: row.strategyId,
      walletId: row.walletId,
      status: row.status,
      requiresApproval: row.requiresApproval,
      approvalStatus: row.approvalStatus,
      createdAt: row.createdAt,
      updatedAt: row.updatedAt,
      payload: ExecutionIntentSchema.parse(row.payload),
    }));
  });

  app.post('/intents', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = createIntentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid intent',
          details: parsed.error.flatten(),
        },
      });
    }
    const id = randomUUID();
    const intent: ExecutionIntent = {
      ...parsed.data,
      id,
      createdAt: new Date().toISOString(),
    };
    const full = ExecutionIntentSchema.parse(intent);
    const requiresApproval = parsed.data.requiresApproval === true;
    await intentRepo.insertIntent(app.db, {
      id: full.id,
      walletId: full.walletId,
      ...(full.strategyId ? { strategyId: full.strategyId } : {}),
      status: 'created',
      payload: full as unknown as Record<string, unknown>,
      requiresApproval,
      approvalStatus: requiresApproval ? 'pending' : 'not_required',
    });
    app.telemetry.emit({
      name: 'intent.created',
      payload: {
        intentId: id,
        ...(full.policyPackId ? { policyPackId: full.policyPackId } : {}),
      },
    });
    return reply.status(201).send(full);
  });

  app.get('/intents/:id', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await intentRepo.getIntentById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
    }
    return ExecutionIntentSchema.parse(row.payload);
  });

  const queue = (name: string) => app.queues[name]!;

  app.post('/intents/:id/quote', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const job = await enqueueJobWithTelemetry(req, {
      queue: queue(QUEUE_NAMES.quoteGeneration),
      jobName: 'quote',
      data: { intentId: id },
      jobOptions: { jobId: `quote-${id}`, ...getDefaultJobOptions(QUEUE_NAMES.quoteGeneration) },
      spanName: 'api.intent.quote.enqueue',
      attributes: { intentId: id },
    });
    const row = await intentRepo.getIntentById(app.db, id);
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.quoteGeneration,
      ...(row ? { policyPackId: policyPackIdFromIntentPayload(row.payload) ?? null } : {}),
    });
  });

  app.post('/intents/:id/route', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const job = await enqueueJobWithTelemetry(req, {
      queue: queue(QUEUE_NAMES.routeGeneration),
      jobName: 'route',
      data: { intentId: id },
      jobOptions: { jobId: `route-${id}`, ...getDefaultJobOptions(QUEUE_NAMES.routeGeneration) },
      spanName: 'api.intent.route.enqueue',
      attributes: { intentId: id },
    });
    const row = await intentRepo.getIntentById(app.db, id);
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.routeGeneration,
      ...(row ? { policyPackId: policyPackIdFromIntentPayload(row.payload) ?? null } : {}),
    });
  });

  app.post('/intents/:id/policy', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = enqueuePolicyBody.safeParse(req.body ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid policy enqueue body',
          details: parsed.error.flatten(),
        },
      });
    }
    const row = await intentRepo.getIntentById(app.db, id);
    if (row && parsed.data.policyPackId) {
      const current = ExecutionIntentSchema.parse(row.payload);
      await intentRepo.updateIntentFields(app.db, id, {
        payload: {
          ...current,
          policyPackId: parsed.data.policyPackId,
        } as unknown as Record<string, unknown>,
      });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: queue(QUEUE_NAMES.policyEvaluation),
      jobName: 'policy',
      data: { intentId: id },
      jobOptions: { jobId: `policy-${id}`, ...getDefaultJobOptions(QUEUE_NAMES.policyEvaluation) },
      spanName: 'api.intent.policy.enqueue',
      attributes: { intentId: id },
    });
    const refreshed = await intentRepo.getIntentById(app.db, id);
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.policyEvaluation,
      ...(refreshed
        ? { policyPackId: policyPackIdFromIntentPayload(refreshed.payload) ?? null }
        : {}),
    });
  });

  app.post('/intents/:id/execute', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const job = await enqueueJobWithTelemetry(req, {
      queue: queue(QUEUE_NAMES.executionProcessing),
      jobName: 'execute',
      data: { intentId: id },
      jobOptions: {
        jobId: `execute-${id}`,
        ...getDefaultJobOptions(QUEUE_NAMES.executionProcessing),
      },
      spanName: 'api.intent.execute.enqueue',
      attributes: { intentId: id },
    });
    const row = await intentRepo.getIntentById(app.db, id);
    return reply.status(202).send({
      jobId: job.id,
      queue: QUEUE_NAMES.executionProcessing,
      ...(row ? { policyPackId: policyPackIdFromIntentPayload(row.payload) ?? null } : {}),
    });
  });

  app.post('/intents/:id/approve', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await intentRepo.getIntentById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
    }
    await intentRepo.updateIntentFields(app.db, id, { approvalStatus: 'approved' });
    await auditRepo.insertAuditEvent(app.db, {
      intentId: id,
      eventType: 'intent.approved',
      payload: {},
    });
    return reply.status(204).send();
  });

  app.post('/intents/:id/hold', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await intentRepo.getIntentById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
    }
    if (!canTransitionIntentStatus(row.status, 'held')) {
      return reply.status(409).send({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition intent from ${row.status} to held`,
        },
      });
    }
    await intentRepo.updateIntentFields(app.db, id, { status: 'held' });
    await auditRepo.insertAuditEvent(app.db, {
      intentId: id,
      eventType: 'intent.held',
      payload: {},
    });
    return reply.status(204).send();
  });

  app.post('/intents/:id/release', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const row = await intentRepo.getIntentById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
    }
    if (row.status !== 'held') {
      return reply.status(409).send({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot release intent from status ${row.status}`,
        },
      });
    }
    const route = await routeRepo.getRoutePlanForIntent(app.db, id);
    const nextStatus = route ? 'routed' : 'quoted';
    if (!canTransitionIntentStatus(row.status, nextStatus)) {
      return reply.status(409).send({
        error: {
          code: 'INVALID_TRANSITION',
          message: `Cannot transition intent from ${row.status} to ${nextStatus}`,
        },
      });
    }
    await intentRepo.updateIntentFields(app.db, id, { status: nextStatus });
    if (route) {
      await enqueueJobWithTelemetry(req, {
        queue: queue(QUEUE_NAMES.policyEvaluation),
        jobName: 'policy',
        data: { intentId: id },
        jobOptions: {
          jobId: `policy-${id}`,
          ...getDefaultJobOptions(QUEUE_NAMES.policyEvaluation),
        },
        spanName: 'api.intent.release.policy.enqueue',
        attributes: { intentId: id },
      });
    } else {
      await enqueueJobWithTelemetry(req, {
        queue: queue(QUEUE_NAMES.routeGeneration),
        jobName: 'route',
        data: { intentId: id },
        jobOptions: { jobId: `route-${id}`, ...getDefaultJobOptions(QUEUE_NAMES.routeGeneration) },
        spanName: 'api.intent.release.route.enqueue',
        attributes: { intentId: id },
      });
    }
    await auditRepo.insertAuditEvent(app.db, {
      intentId: id,
      eventType: 'intent.released',
      payload: { fromStatus: row.status, nextStatus },
    });
    return reply.status(204).send();
  });

  app.post('/intents/:id/override-route', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const schema = z.object({ routePlanId: z.string().uuid() });
    const parsed = schema.safeParse(req.body);
    if (!parsed.success) {
      return reply
        .status(400)
        .send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const plan = await routeRepo.getRoutePlanById(app.db, parsed.data.routePlanId);
    if (!plan || plan.intentId !== id) {
      return reply
        .status(400)
        .send({ error: { code: 'INVALID_PLAN', message: 'Route plan not found for intent' } });
    }
    await routeOverrideRepo.insertRouteOverride(app.db, {
      intentId: id,
      routePlanId: parsed.data.routePlanId,
      payload: plan.payload as Record<string, unknown>,
    });
    await auditRepo.insertAuditEvent(app.db, {
      intentId: id,
      eventType: 'route.override_registered',
      payload: { routePlanId: parsed.data.routePlanId },
    });
    return reply.status(201).send({ routePlanId: parsed.data.routePlanId });
  });
};
