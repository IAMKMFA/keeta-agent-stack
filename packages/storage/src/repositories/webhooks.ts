import { and, asc, desc, eq, inArray, lte, gte } from 'drizzle-orm';
import { sql } from 'drizzle-orm';
import type { Database } from '../db';
import { webhookDeliveries, webhookSubscriptions } from '../schema/webhooks';
import { executionAuditEvents } from '../schema/audit';

export async function createWebhookSubscription(
  db: Database,
  row: typeof webhookSubscriptions.$inferInsert
) {
  const [created] = await db.insert(webhookSubscriptions).values(row).returning();
  return created;
}

export async function listWebhookSubscriptions(db: Database, limit = 100) {
  return db.select().from(webhookSubscriptions).orderBy(desc(webhookSubscriptions.createdAt)).limit(limit);
}

export async function getWebhookSubscriptionById(db: Database, id: string) {
  const rows = await db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.id, id)).limit(1);
  return rows[0];
}

export async function listActiveWebhookSubscriptions(db: Database) {
  return db.select().from(webhookSubscriptions).where(eq(webhookSubscriptions.status, 'active'));
}

export async function updateWebhookSubscription(
  db: Database,
  id: string,
  fields: Partial<
    Pick<typeof webhookSubscriptions.$inferInsert, 'targetUrl' | 'eventTypes' | 'status' | 'secret'>
  >
) {
  const [updated] = await db
    .update(webhookSubscriptions)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(webhookSubscriptions.id, id))
    .returning();
  return updated;
}

export async function insertWebhookDelivery(
  db: Database,
  row: typeof webhookDeliveries.$inferInsert
) {
  const [created] = await db
    .insert(webhookDeliveries)
    .values(row)
    .onConflictDoNothing()
    .returning();
  return created;
}

export async function getWebhookDeliveryById(db: Database, id: string) {
  const rows = await db.select().from(webhookDeliveries).where(eq(webhookDeliveries.id, id)).limit(1);
  return rows[0];
}

export async function listWebhookDeliveries(
  db: Database,
  options: { subscriptionId?: string; limit?: number } = {}
) {
  const rows = await db
    .select()
    .from(webhookDeliveries)
    .where(options.subscriptionId ? eq(webhookDeliveries.subscriptionId, options.subscriptionId) : undefined)
    .orderBy(desc(webhookDeliveries.createdAt))
    .limit(options.limit ?? 100);
  return rows;
}

export async function listDueWebhookDeliveries(db: Database, limit = 100) {
  return db
    .select()
    .from(webhookDeliveries)
    .where(
      and(
        inArray(webhookDeliveries.status, ['pending', 'failed']),
        lte(webhookDeliveries.nextAttemptAt, new Date())
      )
    )
    .orderBy(asc(webhookDeliveries.createdAt))
    .limit(limit);
}

export async function markWebhookDeliveryDelivered(
  db: Database,
  id: string,
  fields: { responseStatus?: number; responseBody?: string; attemptCount: number }
) {
  const [updated] = await db
    .update(webhookDeliveries)
    .set({
      status: 'delivered',
      responseStatus: fields.responseStatus,
      responseBody: fields.responseBody,
      attemptCount: fields.attemptCount,
      deliveredAt: new Date(),
      nextAttemptAt: null,
      lastError: null,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, id))
    .returning();
  return updated;
}

export async function markWebhookDeliveryFailed(
  db: Database,
  id: string,
  fields: {
    responseStatus?: number;
    responseBody?: string;
    lastError?: string;
    attemptCount: number;
    nextAttemptAt?: Date | null;
    status?: string;
  }
) {
  const [updated] = await db
    .update(webhookDeliveries)
    .set({
      status: fields.status ?? 'failed',
      responseStatus: fields.responseStatus,
      responseBody: fields.responseBody,
      lastError: fields.lastError,
      attemptCount: fields.attemptCount,
      nextAttemptAt: fields.nextAttemptAt ?? null,
      updatedAt: new Date(),
    })
    .where(eq(webhookDeliveries.id, id))
    .returning();
  return updated;
}

export async function listAuditEventsSince(db: Database, since: Date, limit = 100) {
  return db
    .select()
    .from(executionAuditEvents)
    .where(gte(executionAuditEvents.createdAt, since))
    .orderBy(asc(executionAuditEvents.createdAt))
    .limit(limit);
}

export async function countWebhookDeliveriesByStatus(
  db: Database,
  options: { since?: Date } = {}
): Promise<Array<{ status: string; count: number }>> {
  const rows = await db
    .select({
      status: webhookDeliveries.status,
      count: sql<number>`count(*)::int`,
    })
    .from(webhookDeliveries)
    .where(options.since ? gte(webhookDeliveries.createdAt, options.since) : undefined)
    .groupBy(webhookDeliveries.status);

  return rows.map((row) => ({
    status: row.status,
    count: row.count ?? 0,
  }));
}
