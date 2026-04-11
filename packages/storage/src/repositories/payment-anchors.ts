import { and, asc, desc, eq, gte, inArray } from 'drizzle-orm';
import type { Database } from '../db';
import { anchorBonds, anchorEvents, paymentAnchors } from '../schema/payment-anchors';

export async function listPaymentAnchors(db: Database, limit = 200) {
  return db.select().from(paymentAnchors).orderBy(desc(paymentAnchors.createdAt)).limit(limit);
}

export async function listPaymentAnchorsByStatuses(
  db: Database,
  statuses: string[],
  limit = 200
) {
  if (statuses.length === 0) return [];
  return db
    .select()
    .from(paymentAnchors)
    .where(inArray(paymentAnchors.status, statuses))
    .orderBy(desc(paymentAnchors.updatedAt))
    .limit(limit);
}

export async function getPaymentAnchor(db: Database, id: string) {
  const rows = await db.select().from(paymentAnchors).where(eq(paymentAnchors.id, id)).limit(1);
  return rows[0];
}

export async function getPaymentAnchorByAdapterId(db: Database, adapterId: string) {
  const rows = await db.select().from(paymentAnchors).where(eq(paymentAnchors.adapterId, adapterId)).limit(1);
  return rows[0];
}

export async function insertPaymentAnchor(db: Database, row: typeof paymentAnchors.$inferInsert) {
  const [created] = await db.insert(paymentAnchors).values(row).returning();
  return created;
}

export async function updatePaymentAnchor(
  db: Database,
  id: string,
  fields: Partial<
    Pick<
      typeof paymentAnchors.$inferInsert,
      | 'adapterId'
      | 'label'
      | 'status'
      | 'corridorKey'
      | 'operatorRef'
      | 'publicLabel'
      | 'corridorConfig'
      | 'supportedAssets'
      | 'commercialTerms'
      | 'metadata'
    >
  >
) {
  const [updated] = await db
    .update(paymentAnchors)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(paymentAnchors.id, id))
    .returning();
  return updated;
}

export async function listAnchorBondsForAnchor(db: Database, paymentAnchorId: string, limit = 20) {
  return db
    .select()
    .from(anchorBonds)
    .where(eq(anchorBonds.paymentAnchorId, paymentAnchorId))
    .orderBy(desc(anchorBonds.createdAt))
    .limit(limit);
}

export async function getLatestAnchorBondForAnchor(db: Database, paymentAnchorId: string) {
  const rows = await listAnchorBondsForAnchor(db, paymentAnchorId, 1);
  return rows[0];
}

export async function insertAnchorBond(db: Database, row: typeof anchorBonds.$inferInsert) {
  const [created] = await db.insert(anchorBonds).values(row).returning();
  return created;
}

export async function updateAnchorBond(
  db: Database,
  id: string,
  fields: Partial<
    Pick<
      typeof anchorBonds.$inferInsert,
      | 'amountAtomic'
      | 'assetId'
      | 'delayDays'
      | 'status'
      | 'lockTxHash'
      | 'lockAccount'
      | 'withdrawalRequestedAt'
      | 'activatedAt'
      | 'releasedAt'
      | 'verified'
      | 'verificationSource'
      | 'verificationDetails'
    >
  >
) {
  const [updated] = await db
    .update(anchorBonds)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(anchorBonds.id, id))
    .returning();
  return updated;
}

export async function insertAnchorEvent(db: Database, row: typeof anchorEvents.$inferInsert) {
  const [created] = await db.insert(anchorEvents).values(row).returning();
  return created;
}

export async function listAnchorEvents(db: Database, paymentAnchorId: string, limit = 50) {
  return db
    .select()
    .from(anchorEvents)
    .where(eq(anchorEvents.paymentAnchorId, paymentAnchorId))
    .orderBy(desc(anchorEvents.createdAt))
    .limit(limit);
}

export async function listRecentAnchorEvents(db: Database, limit = 50) {
  return db.select().from(anchorEvents).orderBy(desc(anchorEvents.createdAt)).limit(limit);
}

export async function listAnchorEventsSince(
  db: Database,
  since: Date,
  limit = 100,
  paymentAnchorId?: string
) {
  return db
    .select()
    .from(anchorEvents)
    .where(
      paymentAnchorId
        ? and(eq(anchorEvents.paymentAnchorId, paymentAnchorId), gte(anchorEvents.createdAt, since))
        : gte(anchorEvents.createdAt, since)
    )
    .orderBy(asc(anchorEvents.createdAt))
    .limit(limit);
}

export async function getAnchorEventById(db: Database, id: string) {
  const rows = await db.select().from(anchorEvents).where(eq(anchorEvents.id, id)).limit(1);
  return rows[0];
}
