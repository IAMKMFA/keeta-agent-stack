import type { Database } from '../db';
import { strategies } from '../schema/strategies';
import { eq } from 'drizzle-orm';

export async function listTemplates(db: Database) {
  return db.select().from(strategies).where(eq(strategies.isTemplate, true));
}

export async function getStrategyById(db: Database, id: string) {
  const rows = await db.select().from(strategies).where(eq(strategies.id, id)).limit(1);
  return rows[0];
}

export async function setStrategyPaused(db: Database, id: string, paused: boolean) {
  await db.update(strategies).set({ paused }).where(eq(strategies.id, id));
}
