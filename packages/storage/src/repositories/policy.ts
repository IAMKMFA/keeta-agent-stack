import type { Database } from '../db';
import { desc, eq } from 'drizzle-orm';
import { policyDecisions, policyPacks } from '../schema/policy';

export async function insertPolicyDecision(
  db: Database,
  row: typeof policyDecisions.$inferInsert
) {
  const [r] = await db.insert(policyDecisions).values(row).returning();
  return r;
}

export async function getLatestPolicyDecisionForIntent(db: Database, intentId: string) {
  const rows = await db
    .select()
    .from(policyDecisions)
    .where(eq(policyDecisions.intentId, intentId))
    .orderBy(desc(policyDecisions.createdAt))
    .limit(1);
  return rows[0];
}

export async function listRecentPolicyDecisions(db: Database, limit = 200) {
  const safeLimit = Math.max(1, Math.min(1000, limit));
  return db
    .select()
    .from(policyDecisions)
    .orderBy(desc(policyDecisions.createdAt))
    .limit(safeLimit);
}

export async function listPolicyPacks(db: Database) {
  return db.select().from(policyPacks).orderBy(desc(policyPacks.updatedAt));
}

export async function getPolicyPackById(db: Database, id: string) {
  const rows = await db.select().from(policyPacks).where(eq(policyPacks.id, id)).limit(1);
  return rows[0];
}

export async function createPolicyPack(db: Database, row: typeof policyPacks.$inferInsert) {
  const [created] = await db.insert(policyPacks).values(row).returning();
  return created;
}

export async function updatePolicyPack(
  db: Database,
  id: string,
  row: Partial<typeof policyPacks.$inferInsert>
) {
  const [updated] = await db
    .update(policyPacks)
    .set({
      ...row,
      updatedAt: new Date(),
    })
    .where(eq(policyPacks.id, id))
    .returning();
  return updated;
}

export async function deletePolicyPack(db: Database, id: string) {
  const [deleted] = await db.delete(policyPacks).where(eq(policyPacks.id, id)).returning();
  return deleted;
}
