import type { Database } from '../db';
import { simulationResults, simulationRuns } from '../schema/simulations';
import { desc, eq } from 'drizzle-orm';

export async function insertSimulationRun(db: Database, row: typeof simulationRuns.$inferInsert) {
  const [r] = await db.insert(simulationRuns).values(row).returning();
  return r;
}

export async function insertSimulationResult(
  db: Database,
  row: typeof simulationResults.$inferInsert
) {
  const [r] = await db.insert(simulationResults).values(row).returning();
  return r;
}

export async function getSimulationRun(db: Database, id: string) {
  const rows = await db.select().from(simulationRuns).where(eq(simulationRuns.id, id)).limit(1);
  return rows[0];
}

export async function getSimulationResultByRun(db: Database, runId: string) {
  const rows = await db
    .select()
    .from(simulationResults)
    .where(eq(simulationResults.runId, runId))
    .limit(1);
  return rows[0];
}

export async function listSimulationRuns(db: Database, limit = 200) {
  return db.select().from(simulationRuns).orderBy(desc(simulationRuns.createdAt)).limit(limit);
}

export async function updateSimulationRunStatus(
  db: Database,
  id: string,
  status: typeof simulationRuns.$inferInsert.status
) {
  const [updated] = await db
    .update(simulationRuns)
    .set({ status })
    .where(eq(simulationRuns.id, id))
    .returning();
  return updated;
}
