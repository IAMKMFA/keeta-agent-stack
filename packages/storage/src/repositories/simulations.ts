import type { Database } from '../db';
import { simulationResults, simulationRuns } from '../schema/simulations';
import { eq } from 'drizzle-orm';

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
