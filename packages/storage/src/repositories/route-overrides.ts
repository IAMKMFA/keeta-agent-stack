import { desc, eq } from 'drizzle-orm';
import type { Database } from '../db';
import { routeOverrides } from '../schema/route-overrides';

export async function insertRouteOverride(db: Database, row: typeof routeOverrides.$inferInsert) {
  const [r] = await db.insert(routeOverrides).values(row).returning();
  return r;
}

export async function getLatestRouteOverrideForIntent(db: Database, intentId: string) {
  const rows = await db
    .select()
    .from(routeOverrides)
    .where(eq(routeOverrides.intentId, intentId))
    .orderBy(desc(routeOverrides.createdAt))
    .limit(1);
  return rows[0];
}
