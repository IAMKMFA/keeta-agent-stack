import { desc, eq } from 'drizzle-orm';
import type { Database } from '../db';
import { intentSnapshots, policySnapshots, routeSnapshots } from '../schema/snapshots';

export async function insertPolicySnapshot(db: Database, row: typeof policySnapshots.$inferInsert) {
  const [r] = await db.insert(policySnapshots).values(row).returning();
  return r;
}

export async function getLatestPolicySnapshotForIntent(db: Database, intentId: string) {
  const rows = await db
    .select()
    .from(policySnapshots)
    .where(eq(policySnapshots.intentId, intentId))
    .orderBy(desc(policySnapshots.createdAt))
    .limit(1);
  return rows[0];
}

export async function insertIntentSnapshot(db: Database, row: typeof intentSnapshots.$inferInsert) {
  const [r] = await db.insert(intentSnapshots).values(row).returning();
  return r;
}

export async function insertRouteSnapshot(db: Database, row: typeof routeSnapshots.$inferInsert) {
  const [r] = await db.insert(routeSnapshots).values(row).returning();
  return r;
}
