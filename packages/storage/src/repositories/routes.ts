import type { Database } from '../db';
import { routePlans, routeSteps } from '../schema/routes';
import { eq } from 'drizzle-orm';

export async function insertRoutePlan(db: Database, row: typeof routePlans.$inferInsert) {
  const [r] = await db.insert(routePlans).values(row).returning();
  return r;
}

export async function insertRouteSteps(db: Database, rows: (typeof routeSteps.$inferInsert)[]) {
  if (rows.length === 0) return [];
  return db.insert(routeSteps).values(rows).returning();
}

export async function getRoutePlanForIntent(db: Database, intentId: string) {
  const rows = await db.select().from(routePlans).where(eq(routePlans.intentId, intentId)).limit(1);
  return rows[0];
}
