import type { Database } from '../db';
import { desc, eq } from 'drizzle-orm';
import { policyDecisions } from '../schema/policy';

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
