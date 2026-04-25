import { asc, desc, eq, gte } from 'drizzle-orm';
import type { Database } from '../db';
import { executionAuditEvents } from '../schema/audit';

export async function insertAuditEvent(
  db: Database,
  row: typeof executionAuditEvents.$inferInsert
) {
  const [r] = await db.insert(executionAuditEvents).values(row).returning();
  return r;
}

export async function getAuditEventById(db: Database, id: string) {
  const rows = await db
    .select()
    .from(executionAuditEvents)
    .where(eq(executionAuditEvents.id, id))
    .limit(1);
  return rows[0];
}

export async function listRecentAuditEvents(db: Database, limit = 100) {
  return db
    .select()
    .from(executionAuditEvents)
    .orderBy(desc(executionAuditEvents.createdAt))
    .limit(limit);
}

export async function listAuditEventsSince(db: Database, since: Date, limit = 100) {
  return db
    .select()
    .from(executionAuditEvents)
    .where(gte(executionAuditEvents.createdAt, since))
    .orderBy(asc(executionAuditEvents.createdAt))
    .limit(limit);
}
