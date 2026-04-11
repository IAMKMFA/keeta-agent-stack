import type { Database } from '../db';
import { jobFailures } from '../schema/job-failures';

export async function insertJobFailure(db: Database, row: typeof jobFailures.$inferInsert) {
  const [r] = await db.insert(jobFailures).values(row).returning();
  return r;
}
