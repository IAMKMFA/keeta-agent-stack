import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { webhookRepo } from '@keeta-agent-sdk/storage';
import { requireOperatorAccess } from '../lib/auth.js';

const createWebhookSchema = z.object({
  targetUrl: z.string().url(),
  eventTypes: z.array(z.string().min(1)).min(1),
  secret: z.string().min(1).optional(),
  status: z.enum(['active', 'paused']).default('active'),
});

const updateWebhookSchema = createWebhookSchema.partial().refine(
  (value) => Object.keys(value).length > 0,
  'Provide at least one field to update'
);

const deliveriesQuerySchema = z.object({
  subscriptionId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

function serializeSubscription(row: Awaited<ReturnType<typeof webhookRepo.getWebhookSubscriptionById>>) {
  if (!row) return row;
  return {
    id: row.id,
    targetUrl: row.targetUrl,
    eventTypes: row.eventTypes,
    status: row.status,
    secretPresent: typeof row.secret === 'string' && row.secret.length > 0,
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

function serializeDelivery(row: Awaited<ReturnType<typeof webhookRepo.getWebhookDeliveryById>>) {
  if (!row) return row;
  return {
    id: row.id,
    subscriptionId: row.subscriptionId,
    eventId: row.auditEventId,
    auditEventId: row.auditEventId,
    eventSource: row.eventSource ?? 'audit',
    status: row.status,
    attemptCount: row.attemptCount,
    responseStatus: row.responseStatus ?? undefined,
    responseBody: row.responseBody ?? undefined,
    lastError: row.lastError ?? undefined,
    deliveredAt: row.deliveredAt?.toISOString(),
    nextAttemptAt: row.nextAttemptAt?.toISOString(),
    createdAt: row.createdAt.toISOString(),
    updatedAt: row.updatedAt.toISOString(),
  };
}

export const webhooksRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ops/webhooks', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const rows = await webhookRepo.listWebhookSubscriptions(app.db, 200);
    return { webhooks: rows.map((row) => serializeSubscription(row)) };
  });

  app.post('/ops/webhooks', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = createWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const created = await webhookRepo.createWebhookSubscription(app.db, {
      targetUrl: parsed.data.targetUrl,
      eventTypes: parsed.data.eventTypes,
      status: parsed.data.status,
      secret: parsed.data.secret ?? null,
      createdAt: new Date(),
      updatedAt: new Date(),
    });
    return reply.status(201).send({ webhook: serializeSubscription(created) });
  });

  app.patch('/ops/webhooks/:id', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = updateWebhookSchema.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const updated = await webhookRepo.updateWebhookSubscription(app.db, id, {
      targetUrl: parsed.data.targetUrl,
      eventTypes: parsed.data.eventTypes,
      status: parsed.data.status,
      ...(parsed.data.secret !== undefined ? { secret: parsed.data.secret } : {}),
    });
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Webhook not found' } });
    }
    return { webhook: serializeSubscription(updated) };
  });

  app.get('/ops/webhook-deliveries', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = deliveriesQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const rows = await webhookRepo.listWebhookDeliveries(app.db, parsed.data);
    return { deliveries: rows.map((row) => serializeDelivery(row)) };
  });
};
