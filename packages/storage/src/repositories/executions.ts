import type { Database } from '../db';
import { executions } from '../schema/executions';

export async function insertExecution(db: Database, row: typeof executions.$inferInsert) {
  const [r] = await db.insert(executions).values(row).returning();
  return r;
}
