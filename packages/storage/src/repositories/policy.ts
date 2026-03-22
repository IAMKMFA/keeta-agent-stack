import type { Database } from '../db';
import { policyDecisions } from '../schema/policy';

export async function insertPolicyDecision(
  db: Database,
  row: typeof policyDecisions.$inferInsert
) {
  const [r] = await db.insert(policyDecisions).values(row).returning();
  return r;
}
