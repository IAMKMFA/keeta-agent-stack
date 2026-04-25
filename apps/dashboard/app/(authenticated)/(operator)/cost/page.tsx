import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatNumber } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Cost & Fees — Keeta Agent Hub' };

interface Bucket {
  bucket: string;
  group: string;
  asset: string | null;
  count: number;
  totalFee: number;
  p50Fee: number;
  p95Fee: number;
}

interface AggregateResponse {
  window: { from: string; to: string };
  bucket: 'hour' | 'day' | 'week';
  groupBy: 'adapter' | 'asset' | 'status' | 'none';
  totals: { rows: number; priced: number; unpriced: number };
  buckets: Bucket[];
}

export default async function CostPage({
  searchParams,
}: {
  searchParams: Promise<{ bucket?: string; groupBy?: string; windowDays?: string }>;
}) {
  requireV2Enabled();
  await requireScope('ops:read');
  const params = await searchParams;

  const qs = new URLSearchParams();
  qs.set('bucket', params.bucket ?? 'day');
  qs.set('groupBy', params.groupBy ?? 'adapter');
  qs.set('windowDays', params.windowDays ?? '30');

  const data = await fetchJson<AggregateResponse>(`/ops/fees/aggregate?${qs}`, {
    window: { from: '', to: '' },
    bucket: 'day',
    groupBy: 'adapter',
    totals: { rows: 0, priced: 0, unpriced: 0 },
    buckets: [],
  });

  const totalFee = data.buckets.reduce((a, b) => a + b.totalFee, 0);
  const totalCount = data.buckets.reduce((a, b) => a + b.count, 0);
  const avgFee = totalCount > 0 ? totalFee / totalCount : 0;

  const byGroup = new Map<string, { count: number; totalFee: number }>();
  for (const b of data.buckets) {
    const curr = byGroup.get(b.group) ?? { count: 0, totalFee: 0 };
    curr.count += b.count;
    curr.totalFee += b.totalFee;
    byGroup.set(b.group, curr);
  }
  const topGroups = [...byGroup.entries()]
    .sort((a, b) => b[1].totalFee - a[1].totalFee)
    .slice(0, 10);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Economics"
        title="Cost & Fees"
        description="Fee totals, distribution, and top-cost adapters across a rolling window. Fees are extracted from execution receipts; executions without a fee field show as unpriced."
        meta={
          <>
            <StatusPill tone="info">
              {data.window.from
                ? `${data.window.from.slice(0, 10)} → ${data.window.to.slice(0, 10)}`
                : 'window'}
            </StatusPill>
            <StatusPill tone="warning">{formatNumber(data.totals.unpriced)} unpriced</StatusPill>
          </>
        }
      />

      <form className="flex flex-wrap items-center gap-2" method="get">
        <label className="flex items-center gap-2 text-xs text-[var(--keeta-muted)]">
          <span>Bucket</span>
          <select
            name="bucket"
            defaultValue={params.bucket ?? 'day'}
            className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-sm"
          >
            <option value="hour">Hour</option>
            <option value="day">Day</option>
            <option value="week">Week</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--keeta-muted)]">
          <span>Group by</span>
          <select
            name="groupBy"
            defaultValue={params.groupBy ?? 'adapter'}
            className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-sm"
          >
            <option value="adapter">Adapter</option>
            <option value="asset">Asset</option>
            <option value="status">Status</option>
            <option value="none">None</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--keeta-muted)]">
          <span>Window</span>
          <select
            name="windowDays"
            defaultValue={params.windowDays ?? '30'}
            className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-sm"
          >
            <option value="7">7 days</option>
            <option value="30">30 days</option>
            <option value="90">90 days</option>
            <option value="180">180 days</option>
          </select>
        </label>
        <button
          type="submit"
          className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-xs hover:bg-[rgba(50,149,144,0.06)]"
        >
          Apply
        </button>
      </form>

      <KpiGrid columns={4}>
        <Kpi
          label="Total fees"
          value={totalFee.toLocaleString(undefined, { maximumFractionDigits: 4 })}
          hint={`across ${formatNumber(totalCount)} executions`}
        />
        <Kpi
          label="Avg fee / exec"
          value={avgFee.toLocaleString(undefined, { maximumFractionDigits: 6 })}
        />
        <Kpi
          label="Executions priced"
          value={formatNumber(data.totals.priced)}
          hint={`${formatNumber(data.totals.unpriced)} unpriced`}
        />
        <Kpi
          label="Buckets"
          value={formatNumber(data.buckets.length)}
          hint={`${data.bucket} · ${data.groupBy}`}
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card kicker="Top cost" title={`Top ${data.groupBy}s by fee spend`}>
          {topGroups.length === 0 ? (
            <EmptyState
              title="No priced executions in window"
              description="Executions in this time window do not have fee fields in their payloads / receipts."
            />
          ) : (
            <ul className="space-y-2">
              {topGroups.map(([group, stats]) => {
                const ratio = totalFee > 0 ? (stats.totalFee / totalFee) * 100 : 0;
                return (
                  <li
                    key={group}
                    className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
                  >
                    <div className="flex items-baseline justify-between text-sm">
                      <span className="font-medium text-[var(--keeta-ink)]">{group}</span>
                      <span className="font-mono text-xs text-[var(--keeta-muted)]">
                        {stats.totalFee.toLocaleString(undefined, {
                          maximumFractionDigits: 4,
                        })}
                      </span>
                    </div>
                    <div className="mt-1 h-1.5 overflow-hidden rounded-full bg-[rgba(50,149,144,0.08)]">
                      <div
                        className="h-full rounded-full bg-gradient-to-r from-[var(--keeta-accent)] to-[var(--keeta-accent-deep)]"
                        style={{ width: `${Math.max(3, ratio)}%` }}
                      />
                    </div>
                    <div className="mt-1 flex justify-between text-[11px] text-[var(--keeta-muted)]">
                      <span>{formatNumber(stats.count)} executions</span>
                      <span>{ratio.toFixed(1)}%</span>
                    </div>
                  </li>
                );
              })}
            </ul>
          )}
        </Card>

        <Card kicker="Timeline" title={`Fee spend by ${data.bucket}`}>
          {data.buckets.length === 0 ? (
            <EmptyState title="No buckets in window" />
          ) : (
            <div className="max-h-[420px] overflow-auto">
              <table className="hub-table">
                <thead>
                  <tr>
                    <th className="px-2 py-2 text-left">Bucket</th>
                    <th className="px-2 py-2 text-left">Group</th>
                    <th className="px-2 py-2 text-right">Count</th>
                    <th className="px-2 py-2 text-right">Total</th>
                    <th className="px-2 py-2 text-right">p50</th>
                    <th className="px-2 py-2 text-right">p95</th>
                  </tr>
                </thead>
                <tbody>
                  {data.buckets
                    .slice(-80)
                    .reverse()
                    .map((b, idx) => (
                      <tr key={`${b.bucket}-${b.group}-${idx}`} className="text-sm">
                        <td className="px-2 py-2 font-mono text-xs">{b.bucket}</td>
                        <td className="px-2 py-2 text-xs">{b.group}</td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {formatNumber(b.count)}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {b.totalFee.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {b.p50Fee.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                        <td className="px-2 py-2 text-right font-mono text-xs">
                          {b.p95Fee.toLocaleString(undefined, { maximumFractionDigits: 4 })}
                        </td>
                      </tr>
                    ))}
                </tbody>
              </table>
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
