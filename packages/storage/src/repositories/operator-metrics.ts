import { and, desc, eq, gte, sql } from 'drizzle-orm';
import type { Database } from '../db';
import { metricSamples } from '../schema/metrics';
import { telemetryEvents } from '../schema/telemetry';
import { executions } from '../schema/executions';

/** All operator metric names written by the aggregation worker. */
export const OPERATOR_METRIC_NAMES = {
  successRate: 'operator.success_rate',
  p50LatencyMs: 'operator.p50_latency_ms',
  p95LatencyMs: 'operator.p95_latency_ms',
  unsettledVolume: 'operator.unsettled_volume',
  bondAgeDays: 'operator.bond_age_days',
  bondVerified: 'operator.bond_verified',
} as const;

/**
 * Returns the single most-recent metric_sample for a given (name, adapterId).
 * When corridorKey is provided, the labels must also match it exactly.
 */
export async function getLatestOperatorMetric(
  db: Database,
  name: string,
  adapterId: string,
  corridorKey?: string
): Promise<{ value: number; capturedAt: Date } | undefined> {
  const labelFilter = corridorKey
    ? sql`${metricSamples.labels} @> ${JSON.stringify({ adapterId, corridorKey })}::jsonb`
    : sql`${metricSamples.labels} @> ${JSON.stringify({ adapterId })}::jsonb`;

  const rows = await db
    .select({ value: metricSamples.value, capturedAt: metricSamples.capturedAt })
    .from(metricSamples)
    .where(and(eq(metricSamples.name, name), labelFilter))
    .orderBy(desc(metricSamples.capturedAt))
    .limit(1);

  return rows[0];
}

export interface OperatorAggregateRow {
  adapterId: string;
  corridorKey: string;
  total: number;
  successes: number;
  successRate: number;
  p50LatencyMs: number | null;
  p95LatencyMs: number | null;
}

export interface OperatorMetricsSnapshot {
  successRate?: number;
  p50LatencyMs?: number;
  p95LatencyMs?: number;
  unsettledVolume?: number;
  bondAgeDays?: number;
  bondVerified?: boolean;
  sampledAt?: Date;
}

/**
 * Aggregates operator.execution_outcome telemetry events from the last 24 hours.
 * Returns one row per (adapterId, corridorKey) with success rate and latency percentiles.
 */
export async function aggregateOutcomesByAdapter(db: Database): Promise<OperatorAggregateRow[]> {
  const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
  const rows = await db.execute<{
    adapter_id: string;
    corridor_key: string;
    total: number;
    successes: number;
    p50: number | null;
    p95: number | null;
  }>(sql`
    SELECT
      payload->>'adapterId' AS adapter_id,
      payload->>'corridorKey' AS corridor_key,
      COUNT(*)::int AS total,
      COUNT(CASE WHEN (payload->>'success')::boolean THEN 1 END)::int AS successes,
      PERCENTILE_CONT(0.5) WITHIN GROUP (
        ORDER BY (payload->>'settlementLatencyMs')::float
      ) FILTER (WHERE payload->>'settlementLatencyMs' IS NOT NULL) AS p50,
      PERCENTILE_CONT(0.95) WITHIN GROUP (
        ORDER BY (payload->>'settlementLatencyMs')::float
      ) FILTER (WHERE payload->>'settlementLatencyMs' IS NOT NULL) AS p95
    FROM ${telemetryEvents}
    WHERE name = 'operator.execution_outcome'
      AND created_at >= ${since}
      AND payload->>'adapterId' IS NOT NULL
    GROUP BY payload->>'adapterId', payload->>'corridorKey'
  `);

  return rows.rows.map((r) => ({
    adapterId: r.adapter_id,
    corridorKey: r.corridor_key,
    total: r.total,
    successes: r.successes,
    successRate: r.total > 0 ? (r.successes / r.total) * 100 : 100,
    p50LatencyMs: r.p50 !== null ? Math.round(r.p50) : null,
    p95LatencyMs: r.p95 !== null ? Math.round(r.p95) : null,
  }));
}

/** Returns count of unsettled executions grouped by adapterId. */
export async function countUnsettledByAdapter(db: Database): Promise<Map<string, number>> {
  const rows = await db.execute<{ adapter_id: string; count: number }>(sql`
    SELECT adapter_id, COUNT(*)::int AS count
    FROM ${executions}
    WHERE status IN ('pending', 'submitted')
      AND (settlement_state NOT IN ('confirmed', 'failed') OR settlement_state IS NULL)
    GROUP BY adapter_id
  `);
  const map = new Map<string, number>();
  for (const r of rows.rows) {
    map.set(r.adapter_id, r.count);
  }
  return map;
}

/**
 * Returns all metric_sample rows for a given adapterId since a given date.
 * Used by the aggregation worker to check whether data already exists.
 */
export async function listOperatorMetricSince(
  db: Database,
  adapterId: string,
  since: Date,
  limit = 100
): Promise<Array<{ name: string; labels: Record<string, unknown>; value: number; capturedAt: Date }>> {
  return db
    .select({
      name: metricSamples.name,
      labels: metricSamples.labels,
      value: metricSamples.value,
      capturedAt: metricSamples.capturedAt,
    })
    .from(metricSamples)
    .where(
      and(
        sql`${metricSamples.labels} @> ${JSON.stringify({ adapterId })}::jsonb`,
        gte(metricSamples.capturedAt, since)
      )
    )
    .orderBy(desc(metricSamples.capturedAt))
    .limit(limit);
}

export async function getOperatorMetricsSnapshot(
  db: Database,
  adapterId: string,
  corridorKey?: string
): Promise<OperatorMetricsSnapshot> {
  const [successRate, p50, p95, unsettled, bondAge, bondVerified] = await Promise.all([
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.successRate, adapterId, corridorKey),
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.p50LatencyMs, adapterId, corridorKey),
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.p95LatencyMs, adapterId, corridorKey),
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.unsettledVolume, adapterId),
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.bondAgeDays, adapterId),
    getLatestOperatorMetric(db, OPERATOR_METRIC_NAMES.bondVerified, adapterId),
  ]);

  const sampledAt = [
    successRate?.capturedAt,
    p50?.capturedAt,
    p95?.capturedAt,
    unsettled?.capturedAt,
    bondAge?.capturedAt,
    bondVerified?.capturedAt,
  ]
    .filter((value): value is Date => value instanceof Date)
    .sort((a, b) => b.getTime() - a.getTime())[0];

  return {
    successRate: successRate?.value,
    p50LatencyMs: p50?.value,
    p95LatencyMs: p95?.value,
    unsettledVolume: unsettled?.value,
    bondAgeDays: bondAge?.value,
    bondVerified: bondVerified !== undefined ? bondVerified.value === 1 : undefined,
    sampledAt,
  };
}
