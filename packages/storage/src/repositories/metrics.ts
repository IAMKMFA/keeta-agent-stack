import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { metricSamples } from '../schema/metrics';

export async function insertMetricSample(db: Database, row: typeof metricSamples.$inferInsert) {
  const [r] = await db.insert(metricSamples).values(row).returning();
  return r;
}

export async function listRecentMetricSamples(db: Database, limit = 500) {
  return db.select().from(metricSamples).orderBy(desc(metricSamples.capturedAt)).limit(limit);
}

export async function countMetricSamples(
  db: Database,
  name: string,
  options: { since?: Date } = {}
) {
  const rows = await db
    .select({ count: sql<number>`count(*)::int` })
    .from(metricSamples)
    .where(
      and(
        eq(metricSamples.name, name),
        options.since ? gte(metricSamples.capturedAt, options.since) : undefined
      )
    );
  return rows[0]?.count ?? 0;
}
