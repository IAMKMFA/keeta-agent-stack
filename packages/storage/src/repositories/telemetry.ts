import type { Database } from '../db';
import { telemetryEvents } from '../schema/telemetry';

export async function insertTelemetryBatch(
  db: Database,
  rows: (typeof telemetryEvents.$inferInsert)[]
) {
  if (rows.length === 0) return [];
  return db.insert(telemetryEvents).values(rows).returning();
}
