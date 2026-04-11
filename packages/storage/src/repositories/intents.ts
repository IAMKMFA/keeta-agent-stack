import type { Database } from '../db';
import { executionIntents } from '../schema/intents';
import { desc, eq } from 'drizzle-orm';

export async function insertIntent(
  db: Database,
  row: typeof executionIntents.$inferInsert
) {
  const [r] = await db.insert(executionIntents).values(row).returning();
  return r;
}

export async function getIntentById(db: Database, id: string) {
  const rows = await db.select().from(executionIntents).where(eq(executionIntents.id, id)).limit(1);
  return rows[0];
}

export async function listIntents(db: Database, limit = 200) {
  return db.select().from(executionIntents).orderBy(desc(executionIntents.createdAt)).limit(limit);
}

export async function updateIntentStatus(db: Database, id: string, status: string) {
  await db
    .update(executionIntents)
    .set({ status, updatedAt: new Date() })
    .where(eq(executionIntents.id, id));
}

export async function updateIntentFields(
  db: Database,
  id: string,
  fields: Partial<
    Pick<
      typeof executionIntents.$inferInsert,
      'status' | 'requiresApproval' | 'approvalStatus' | 'payload'
    >
  >
) {
  await db
    .update(executionIntents)
    .set({ ...fields, updatedAt: new Date() })
    .where(eq(executionIntents.id, id));
}
