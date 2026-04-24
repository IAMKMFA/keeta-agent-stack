import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { executionRepo } from '@keeta-agent-stack/storage';
import { requireOperatorAccess } from '../lib/auth.js';

const aggregateQuerySchema = z.object({
  from: z.string().datetime().optional(),
  to: z.string().datetime().optional(),
  bucket: z.enum(['hour', 'day', 'week']).default('day'),
  groupBy: z.enum(['adapter', 'asset', 'status', 'none']).default('adapter'),
  windowDays: z.coerce.number().min(1).max(180).default(30),
});

function readFee(row: { payload?: Record<string, unknown> | null; receipt?: Record<string, unknown> | null; normalizedReceipt?: Record<string, unknown> | null }): {
  amount: number | null;
  asset: string | null;
} {
  const sources: Array<Record<string, unknown> | null | undefined> = [
    row.normalizedReceipt,
    row.receipt,
    row.payload,
  ];
  for (const src of sources) {
    if (!src) continue;
    const fee = (src as Record<string, unknown>).fee;
    if (fee && typeof fee === 'object') {
      const amountRaw = (fee as Record<string, unknown>).amount;
      const assetRaw = (fee as Record<string, unknown>).asset;
      const amount =
        typeof amountRaw === 'number'
          ? amountRaw
          : typeof amountRaw === 'string'
            ? Number.parseFloat(amountRaw)
            : null;
      const asset = typeof assetRaw === 'string' ? assetRaw : null;
      if (amount !== null && Number.isFinite(amount)) {
        return { amount, asset };
      }
    }
    const flat = (src as Record<string, unknown>).feeAmount;
    if (typeof flat === 'number' && Number.isFinite(flat)) {
      return {
        amount: flat,
        asset:
          typeof (src as Record<string, unknown>).feeAsset === 'string'
            ? ((src as Record<string, unknown>).feeAsset as string)
            : null,
      };
    }
  }
  return { amount: null, asset: null };
}

function bucketKey(bucket: 'hour' | 'day' | 'week', d: Date): string {
  const iso = d.toISOString();
  if (bucket === 'hour') return iso.slice(0, 13) + ':00:00Z';
  if (bucket === 'day') return iso.slice(0, 10);
  const year = d.getUTCFullYear();
  const startOfYear = Date.UTC(year, 0, 1);
  const diffDays = Math.floor((d.getTime() - startOfYear) / 86_400_000);
  const isoWeek = Math.max(1, Math.ceil((diffDays + 1) / 7));
  return `${year}-W${String(isoWeek).padStart(2, '0')}`;
}

function percentile(values: number[], p: number): number {
  if (values.length === 0) return 0;
  const sorted = [...values].sort((a, b) => a - b);
  const idx = Math.min(sorted.length - 1, Math.max(0, Math.floor(p * (sorted.length - 1))));
  return sorted[idx]!;
}

export const feesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ops/fees/aggregate', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }

    const parsed = aggregateQuerySchema.safeParse(req.query);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() },
      });
    }
    const { bucket, groupBy, windowDays } = parsed.data;
    const to = parsed.data.to ? new Date(parsed.data.to) : new Date();
    const from = parsed.data.from
      ? new Date(parsed.data.from)
      : new Date(to.getTime() - windowDays * 86_400_000);

    const rows = await executionRepo.listExecutionsSince(app.db, from, 10_000);
    const filtered = rows.filter((r) => r.createdAt && r.createdAt.getTime() <= to.getTime());

    type Bucket = {
      bucket: string;
      group: string;
      count: number;
      fees: number[];
      totalFee: number;
      asset: string | null;
    };
    const map = new Map<string, Bucket>();
    let missingFee = 0;

    for (const row of filtered) {
      const { amount, asset } = readFee(row);
      if (amount === null) {
        missingFee += 1;
        continue;
      }
      const group =
        groupBy === 'none'
          ? 'all'
          : groupBy === 'adapter'
            ? row.adapterId
            : groupBy === 'status'
              ? row.status ?? 'unknown'
              : asset ?? 'unknown';
      const key = `${bucketKey(bucket, row.createdAt)}|${group}`;
      const entry = map.get(key);
      if (entry) {
        entry.count += 1;
        entry.fees.push(amount);
        entry.totalFee += amount;
      } else {
        map.set(key, {
          bucket: bucketKey(bucket, row.createdAt),
          group,
          count: 1,
          fees: [amount],
          totalFee: amount,
          asset,
        });
      }
    }

    const buckets = [...map.values()]
      .map((b) => ({
        bucket: b.bucket,
        group: b.group,
        asset: b.asset,
        count: b.count,
        totalFee: Math.round(b.totalFee * 1e6) / 1e6,
        p50Fee: Math.round(percentile(b.fees, 0.5) * 1e6) / 1e6,
        p95Fee: Math.round(percentile(b.fees, 0.95) * 1e6) / 1e6,
      }))
      .sort((a, b) => (a.bucket < b.bucket ? -1 : a.bucket > b.bucket ? 1 : 0));

    return {
      window: { from: from.toISOString(), to: to.toISOString() },
      bucket,
      groupBy,
      totals: {
        rows: filtered.length,
        priced: filtered.length - missingFee,
        unpriced: missingFee,
      },
      buckets,
    };
  });
};
