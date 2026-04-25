import type { Database } from '../db';
import { strategies } from '../schema/strategies';
import { desc, eq } from 'drizzle-orm';

export async function listTemplates(db: Database) {
  return db.select().from(strategies).where(eq(strategies.isTemplate, true));
}

export async function listStrategies(db: Database, limit = 200) {
  return db.select().from(strategies).orderBy(desc(strategies.createdAt)).limit(limit);
}

export async function createStrategy(db: Database, row: typeof strategies.$inferInsert) {
  const [created] = await db.insert(strategies).values(row).returning();
  return created;
}

export async function getStrategyById(db: Database, id: string) {
  const rows = await db.select().from(strategies).where(eq(strategies.id, id)).limit(1);
  return rows[0];
}

export async function setStrategyPaused(db: Database, id: string, paused: boolean) {
  await db.update(strategies).set({ paused }).where(eq(strategies.id, id));
}

export async function setStrategyPolicyPackId(
  db: Database,
  id: string,
  policyPackId: string | null
) {
  const existing = await getStrategyById(db, id);
  if (!existing) {
    return null;
  }
  const nextConfig = { ...(existing.config ?? {}) };
  if (policyPackId === null) {
    delete nextConfig.policyPackId;
  } else {
    nextConfig.policyPackId = policyPackId;
  }
  const [updated] = await db
    .update(strategies)
    .set({ config: nextConfig })
    .where(eq(strategies.id, id))
    .returning();
  return updated;
}
