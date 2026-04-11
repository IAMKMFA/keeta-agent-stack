import type { Redis } from 'ioredis';
import type { Database } from '@keeta-agent-sdk/storage';
import { operatorMetricsRepo } from '@keeta-agent-sdk/storage';
import type { AppEnv } from '@keeta-agent-sdk/config';
import type { RouteScoreAdjustment } from '@keeta-agent-sdk/types';

export interface OperatorMetrics {
  successRate?: number;       // 0–100 (rolling 24h)
  p50LatencyMs?: number;
  p95LatencyMs?: number;
  unsettledVolume?: number;
  bondAgeDays?: number;
  bondVerified?: boolean;
  sampledAt: number;          // Date.now() when this entry was cached
}

/** Thin Redis-backed TTL cache for per-adapter operator metrics used at routing time. */
export class OperatorMetricsCache {
  constructor(
    private readonly redis: Redis,
    private readonly ttlMs: number
  ) {}

  private key(adapterId: string, corridorKey: string): string {
    return `opmetrics:${adapterId}:${corridorKey}`;
  }

  async get(adapterId: string, corridorKey: string): Promise<OperatorMetrics | null> {
    const raw = await this.redis.get(this.key(adapterId, corridorKey));
    if (!raw) return null;
    try {
      return JSON.parse(raw) as OperatorMetrics;
    } catch {
      return null;
    }
  }

  async set(adapterId: string, corridorKey: string, metrics: OperatorMetrics): Promise<void> {
    await this.redis.set(
      this.key(adapterId, corridorKey),
      JSON.stringify(metrics),
      'PX',
      this.ttlMs
    );
  }

  /** Invalidate all entries for an adapterId by deleting matching keys. */
  async invalidate(adapterId: string): Promise<void> {
    const keys = await this.redis.keys(`opmetrics:${adapterId}:*`);
    if (keys.length > 0) {
      await this.redis.del(...keys);
    }
  }
}

/**
 * Fetches operator metrics for a given adapter+corridor pair.
 * Checks the Redis cache first; falls back to DB on miss and repopulates the cache.
 */
export async function fetchOperatorMetrics(
  cache: OperatorMetricsCache,
  db: Database,
  adapterId: string,
  corridorKey: string
): Promise<OperatorMetrics | null> {
  const cached = await cache.get(adapterId, corridorKey);
  if (cached) return cached;

  const [successRate, p50, p95, unsettled, bondAgeRow, bondVerifiedRow] = await Promise.all([
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.successRate,
      adapterId,
      corridorKey
    ),
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.p50LatencyMs,
      adapterId,
      corridorKey
    ),
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.p95LatencyMs,
      adapterId,
      corridorKey
    ),
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.unsettledVolume,
      adapterId
    ),
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.bondAgeDays,
      adapterId
    ),
    operatorMetricsRepo.getLatestOperatorMetric(
      db,
      operatorMetricsRepo.OPERATOR_METRIC_NAMES.bondVerified,
      adapterId
    ),
  ]);

  // If no metric data at all, store a sentinel so we don't hammer the DB on every route
  const metrics: OperatorMetrics = {
    successRate: successRate?.value,
    p50LatencyMs: p50?.value,
    p95LatencyMs: p95?.value,
    unsettledVolume: unsettled?.value,
    bondAgeDays: bondAgeRow?.value,
    bondVerified: bondVerifiedRow !== undefined ? bondVerifiedRow.value === 1 : undefined,
    sampledAt: Date.now(),
  };

  await cache.set(adapterId, corridorKey, metrics);
  return metrics;
}

const UNSETTLED_HIGH_WATER = 20;

/**
 * Builds dynamic score adjustments from live operator metrics.
 * Returns an empty array when no metrics are available (cold-start safe).
 */
export function buildDynamicScoreAdjustments(
  metrics: OperatorMetrics | null,
  env: Pick<AppEnv, 'OPERATOR_SUCCESS_RATE_MIN_PCT' | 'OPERATOR_LATENCY_P95_THRESHOLD_MS'>
): { adjustments: RouteScoreAdjustment[]; block: boolean } {
  if (!metrics) return { adjustments: [], block: false };

  const adjustments: RouteScoreAdjustment[] = [];
  let block = false;

  // --- Success rate ---
  if (typeof metrics.successRate === 'number') {
    if (metrics.successRate < 80) {
      // Hard block — below minimum viable threshold
      block = true;
      adjustments.push({ source: 'anchor_operator_success_rate_block', value: 0 });
    } else if (metrics.successRate < env.OPERATOR_SUCCESS_RATE_MIN_PCT) {
      // Scaled penalty: 0 at min threshold, -15 at 80%
      const range = env.OPERATOR_SUCCESS_RATE_MIN_PCT - 80;
      const deficit = env.OPERATOR_SUCCESS_RATE_MIN_PCT - metrics.successRate;
      const penalty = range > 0 ? -Math.round((deficit / range) * 15) : -3;
      adjustments.push({ source: 'anchor_operator_success_rate_penalty', value: penalty });
    }
  }

  // --- p95 latency ---
  if (typeof metrics.p95LatencyMs === 'number') {
    const threshold = env.OPERATOR_LATENCY_P95_THRESHOLD_MS;
    if (metrics.p95LatencyMs > threshold) {
      // Penalty scales up to -8 at 3× the threshold
      const overage = metrics.p95LatencyMs - threshold;
      const penalty = -Math.min(8, Math.round((overage / threshold) * 4));
      adjustments.push({ source: 'anchor_operator_latency_p95_penalty', value: penalty });
    }
  }

  // --- Corridor capacity (unsettled volume) ---
  if (typeof metrics.unsettledVolume === 'number' && metrics.unsettledVolume > UNSETTLED_HIGH_WATER) {
    const overage = metrics.unsettledVolume - UNSETTLED_HIGH_WATER;
    const penalty = -Math.min(6, Math.round(overage / 5));
    adjustments.push({ source: 'anchor_operator_capacity_penalty', value: penalty });
  }

  // --- Bond proof signal ---
  if (typeof metrics.bondVerified === 'boolean' && typeof metrics.bondAgeDays === 'number') {
    if (metrics.bondVerified) {
      if (metrics.bondAgeDays < 30) {
        // Fresh, verified bond — slight boost
        adjustments.push({ source: 'anchor_operator_bond_proof', value: 3 });
      } else if (metrics.bondAgeDays > 80) {
        // Approaching withdrawal window — slight penalty
        adjustments.push({ source: 'anchor_operator_bond_proof', value: -2 });
      }
    } else {
      adjustments.push({ source: 'anchor_operator_bond_proof', value: -5 });
    }
  }

  return { adjustments, block };
}
