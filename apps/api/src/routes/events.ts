import type { FastifyInstance, FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { auditRepo, paymentAnchorRepo } from '@keeta-agent-sdk/storage';
import { requireOperatorAccess } from '../lib/auth.js';

const querySchema = z.object({
  after: z.string().datetime().optional(),
  eventType: z.string().min(1).optional(),
  intentId: z.string().uuid().optional(),
  paymentAnchorId: z.string().uuid().optional(),
  limit: z.coerce.number().int().min(1).max(500).default(100),
});

type StreamableAuditEvent = {
  id: string;
  source: 'audit' | 'anchor';
  eventType: string;
  intentId?: string | null;
  paymentAnchorId?: string | null;
  executionId: string | null;
  payload: Record<string, unknown>;
  correlationId: string | null;
  createdAt: Date;
};

function filterEvents(
  rows: StreamableAuditEvent[],
  query: z.infer<typeof querySchema>
) {
  return rows.filter((row) => {
    if (query.eventType && row.eventType !== query.eventType) return false;
    if (query.intentId && row.intentId !== query.intentId) return false;
    if (query.paymentAnchorId && row.paymentAnchorId !== query.paymentAnchorId) return false;
    return true;
  });
}

function sortEvents(rows: StreamableAuditEvent[], order: 'asc' | 'desc') {
  return [...rows].sort((left, right) => {
    const delta = left.createdAt.getTime() - right.createdAt.getTime();
    if (delta !== 0) {
      return order === 'asc' ? delta : -delta;
    }
    return order === 'asc' ? left.id.localeCompare(right.id) : right.id.localeCompare(left.id);
  });
}

async function loadEvents(
  app: FastifyInstance,
  query: z.infer<typeof querySchema>
): Promise<StreamableAuditEvent[]> {
  const fetchLimit = Math.min(query.limit * 2, 1000);

  if (query.after) {
    const since = new Date(query.after);
    const [auditRows, anchorRows] = await Promise.all([
      auditRepo.listAuditEventsSince(app.db, since, fetchLimit),
      paymentAnchorRepo.listAnchorEventsSince(app.db, since, fetchLimit, query.paymentAnchorId),
    ]);

    return sortEvents(
      filterEvents(
        [
          ...auditRows.map((row) => ({
            id: row.id,
            source: 'audit' as const,
            eventType: row.eventType,
            intentId: row.intentId,
            executionId: row.executionId ?? null,
            payload: row.payload,
            correlationId: row.correlationId ?? null,
            createdAt: row.createdAt,
          })),
          ...anchorRows.map((row) => ({
            id: row.id,
            source: 'anchor' as const,
            eventType: row.eventType,
            paymentAnchorId: row.paymentAnchorId,
            executionId: null,
            payload: row.payload,
            correlationId: null,
            createdAt: row.createdAt,
          })),
        ],
        query
      ),
      'asc'
    ).slice(0, query.limit);
  }

  const [auditRows, anchorRows] = await Promise.all([
    auditRepo.listRecentAuditEvents(app.db, fetchLimit),
    query.paymentAnchorId
      ? paymentAnchorRepo.listAnchorEvents(app.db, query.paymentAnchorId, fetchLimit)
      : paymentAnchorRepo.listRecentAnchorEvents(app.db, fetchLimit),
  ]);

  return sortEvents(
    filterEvents(
      [
        ...auditRows.map((row) => ({
          id: row.id,
          source: 'audit' as const,
          eventType: row.eventType,
          intentId: row.intentId,
          executionId: row.executionId ?? null,
          payload: row.payload,
          correlationId: row.correlationId ?? null,
          createdAt: row.createdAt,
        })),
        ...anchorRows.map((row) => ({
          id: row.id,
          source: 'anchor' as const,
          eventType: row.eventType,
          paymentAnchorId: row.paymentAnchorId,
          executionId: null,
          payload: row.payload,
          correlationId: null,
          createdAt: row.createdAt,
        })),
      ],
      query
    ),
    'desc'
  ).slice(0, query.limit);
}

export const eventsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/events', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const query = parsed.data;
    const rows = await loadEvents(app, query);
    return {
      events: rows.map((row) => ({
        id: row.id,
        source: row.source,
        eventType: row.eventType,
        ...(row.intentId ? { intentId: row.intentId } : {}),
        ...(row.paymentAnchorId ? { paymentAnchorId: row.paymentAnchorId } : {}),
        ...(row.executionId ? { executionId: row.executionId } : {}),
        payload: row.payload,
        ...(row.correlationId ? { correlationId: row.correlationId } : {}),
        createdAt: row.createdAt.toISOString(),
      })),
    };
  });

  app.get('/events/stream', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = querySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const query = parsed.data;
    reply.hijack();
    reply.raw.writeHead(200, {
      'Content-Type': 'text/event-stream',
      'Cache-Control': 'no-cache, no-transform',
      Connection: 'keep-alive',
      'X-Accel-Buffering': 'no',
    });
    reply.raw.write(`retry: 3000\n\n`);

    let closed = false;
    let cursor = query.after ? new Date(query.after) : new Date();
    const seenIds = new Set<string>();
    const writeRows = async () => {
      const rows = await loadEvents(app, { ...query, after: cursor.toISOString() });
      for (const row of rows) {
        if (seenIds.has(row.id)) continue;
        seenIds.add(row.id);
        if (seenIds.size > 1000) {
          const first = seenIds.values().next().value;
          if (first) seenIds.delete(first);
        }
        reply.raw.write(`id: ${row.id}\n`);
        reply.raw.write(
          `data: ${JSON.stringify({
            id: row.id,
            source: row.source,
            eventType: row.eventType,
            ...(row.intentId ? { intentId: row.intentId } : {}),
            ...(row.paymentAnchorId ? { paymentAnchorId: row.paymentAnchorId } : {}),
            ...(row.executionId ? { executionId: row.executionId } : {}),
            payload: row.payload,
            ...(row.correlationId ? { correlationId: row.correlationId } : {}),
            createdAt: row.createdAt.toISOString(),
          })}\n\n`
        );
        cursor = new Date(row.createdAt);
      }
    };

    await writeRows();
    const poll = setInterval(() => {
      if (closed) return;
      void writeRows().catch((err) => app.log.error({ err }, 'event stream poll failed'));
    }, 1500);
    const heartbeat = setInterval(() => {
      if (!closed) {
        reply.raw.write(`: keep-alive\n\n`);
      }
    }, 15_000);

    const close = () => {
      closed = true;
      clearInterval(poll);
      clearInterval(heartbeat);
      reply.raw.end();
    };
    req.raw.on('close', close);
    req.raw.on('end', close);
  });
};
