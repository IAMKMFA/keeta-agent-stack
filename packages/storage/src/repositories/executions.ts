import { and, desc, eq, gte, inArray, lt, or, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { executions } from '../schema/executions';

export async function insertExecution(
  db: Database,
  row: typeof executions.$inferInsert
) {
  const [r] = await db.insert(executions).values(row).returning();
  return r;
}

export async function listExecutions(db: Database, limit = 100) {
  return db.select().from(executions).orderBy(desc(executions.createdAt)).limit(limit);
}

/**
 * List executions created at or after the given timestamp. Used by the
 * Cost & Fees aggregate endpoint. Capped at `limit` rows to protect the
 * API; callers must page via timestamp windows for larger ranges.
 */
export async function listExecutionsSince(
  db: Database,
  since: Date,
  limit = 5000
) {
  const safeLimit = Math.max(1, Math.min(10000, limit));
  return db
    .select()
    .from(executions)
    .where(gte(executions.createdAt, since))
    .orderBy(desc(executions.createdAt))
    .limit(safeLimit);
}

export async function getLatestExecutionForIntent(db: Database, intentId: string) {
  const rows = await db
    .select()
    .from(executions)
    .where(eq(executions.intentId, intentId))
    .orderBy(desc(executions.createdAt))
    .limit(1);
  return rows[0];
}

/** True if a prior execution already progressed on-chain enough to skip duplicate submit. */
export async function hasBlockingExecutionForIntent(db: Database, intentId: string) {
  const row = await getLatestExecutionForIntent(db, intentId);
  if (!row) return false;
  const st = row.settlementState ?? '';
  const status = row.status ?? '';
  if (status === 'failed') return false;
  if (['submitted', 'confirmed', 'unknown'].includes(st)) return true;
  if (['submitted', 'confirmed'].includes(status)) return true;
  return false;
}

export async function countUnsettledExecutions(db: Database) {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(executions)
    .where(
      and(
        inArray(executions.status, ['pending', 'submitted']),
        or(
          inArray(executions.settlementState, ['submitted', 'unknown']),
          sql`${executions.settlementState} is null`
        )
      )
    );
  return rows[0]?.c ?? 0;
}

export async function countTradesSince(db: Database, since: Date) {
  const rows = await db
    .select({ c: sql<number>`count(*)::int` })
    .from(executions)
    .where(sql`${executions.createdAt} >= ${since}`);
  return rows[0]?.c ?? 0;
}

export async function getExecutionLatencySnapshot(
  db: Database,
  since: Date
): Promise<{
  avgLatencyMs: number | null;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}> {
  const rows = await db.execute<{
    avg_latency_ms: number | null;
    p50_latency_ms: number | null;
    p95_latency_ms: number | null;
  }>(sql`
    SELECT
      AVG(settlement_latency_ms)::float AS avg_latency_ms,
      PERCENTILE_CONT(0.5) WITHIN GROUP (ORDER BY settlement_latency_ms::float) AS p50_latency_ms,
      PERCENTILE_CONT(0.95) WITHIN GROUP (ORDER BY settlement_latency_ms::float) AS p95_latency_ms
    FROM ${executions}
    WHERE settlement_latency_ms IS NOT NULL
      AND created_at >= ${since}
  `);

  return {
    avgLatencyMs: rows.rows[0]?.avg_latency_ms ?? null,
    p50LatencyMs: rows.rows[0]?.p50_latency_ms ?? null,
    p95LatencyMs: rows.rows[0]?.p95_latency_ms ?? null,
  };
}

export async function patchExecutionJobMeta(
  db: Database,
  id: string,
  fields: Partial<Pick<typeof executions.$inferInsert, 'lastJobError' | 'lastJobId' | 'lifecycleState'>>
) {
  await db.update(executions).set(fields).where(eq(executions.id, id));
}

export async function patchExecutionLatency(
  db: Database,
  id: string,
  fields: { startedAt: Date; settlementLatencyMs: number }
) {
  await db.update(executions).set(fields).where(eq(executions.id, id));
}

/** Count unsettled executions per adapterId for capacity scoring. */
export async function countUnsettledByAdapter(db: Database): Promise<Array<{ adapterId: string; count: number }>> {
  const rows = await db
    .select({
      adapterId: executions.adapterId,
      count: sql<number>`count(*)::int`,
    })
    .from(executions)
    .where(
      and(
        inArray(executions.status, ['pending', 'submitted']),
        or(
          inArray(executions.settlementState, ['submitted', 'unknown']),
          sql`${executions.settlementState} is null`
        )
      )
    )
    .groupBy(executions.adapterId);
  return rows.map((r) => ({ adapterId: r.adapterId, count: r.count ?? 0 }));
}

export async function listExecutionsForReconciliation(db: Database, olderThanMs: number, limit = 50) {
  const cutoff = new Date(Date.now() - olderThanMs);
  return db
    .select()
    .from(executions)
    .where(
      and(
        inArray(executions.settlementState, ['submitted', 'unknown']),
        lt(executions.createdAt, cutoff)
      )
    )
    .limit(limit);
}
