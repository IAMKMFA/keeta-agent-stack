import { requireRole } from '../../../../lib/auth';
import { fetchJson } from '../../../../lib/api';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { VolumeTrend } from '../../../../components/charts/VolumeTrend';
import { formatNumber } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Overview — Keeta Agent Hub' };

type ExecutionRow = { id: string; status: string; createdAt: string; completedAt?: string | null };
type AnchorRow = { id: string; displayName?: string; name?: string; bondAmount?: string | number };

function toDay(iso: string): string | null {
  const d = new Date(iso);
  if (Number.isNaN(d.getTime())) return null;
  return d.toISOString().slice(0, 10);
}

function bucket(
  values: ExecutionRow[],
  days: number
): Array<{ day: string; count: number; success: number }> {
  const bounds = Date.now() - days * 86_400_000;
  const map = new Map<string, { day: string; count: number; success: number }>();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(Date.now() - i * 86_400_000).toISOString().slice(0, 10);
    map.set(d, { day: d, count: 0, success: 0 });
  }
  for (const row of values) {
    const t = Date.parse(row.createdAt);
    if (!Number.isFinite(t) || t < bounds) continue;
    const key = toDay(row.createdAt);
    if (!key) continue;
    const cell = map.get(key);
    if (!cell) continue;
    cell.count += 1;
    if (row.status === 'settled' || row.status === 'completed') cell.success += 1;
  }
  return [...map.values()];
}

export default async function ExecOverviewPage() {
  const viewer = await requireRole(['admin', 'operator', 'exec']);

  const [executions, anchors] = await Promise.all([
    fetchJson<ExecutionRow[]>('/executions', []),
    fetchJson<AnchorRow[]>('/anchors', []),
  ]);

  const total = executions.length;
  const succeeded = executions.filter(
    (e) => e.status === 'settled' || e.status === 'completed'
  ).length;
  const failed = executions.filter(
    (e) => e.status === 'failed' || e.status === 'reverted' || e.status === 'cancelled'
  ).length;
  const successRate =
    succeeded + failed > 0 ? Math.round((succeeded / (succeeded + failed)) * 1000) / 10 : 0;

  const trend30 = bucket(executions, 30);
  const trend90 = bucket(executions, 90);

  const last7 = trend30.slice(-7).reduce((a, b) => a + b.count, 0);
  const prev7 = trend30.slice(-14, -7).reduce((a, b) => a + b.count, 0);
  const wowDelta = prev7 > 0 ? Math.round(((last7 - prev7) / prev7) * 1000) / 10 : 0;

  const bondedCount = anchors.filter((a) => {
    const b = a.bondAmount;
    if (typeof b === 'string') return Number.parseFloat(b) > 0;
    return typeof b === 'number' && b > 0;
  }).length;
  const bondCoverage = anchors.length > 0 ? Math.round((bondedCount / anchors.length) * 100) : 0;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Executive · Read-only"
        title={`Overview${viewer.displayName ? `, ${viewer.displayName.split(' ')[0]}` : ''}`}
        description="Headline KPIs, volume trends, success rate, and anchor bond coverage — suitable for executive and stakeholder review."
        meta={<StatusPill tone="info">Read-only</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi
          label="Executions all-time"
          value={formatNumber(total)}
          hint={`${formatNumber(succeeded)} settled`}
        />
        <Kpi
          label="Success rate"
          value={`${successRate}`}
          unit="%"
          hint={`${formatNumber(failed)} failed`}
          trend={successRate >= 95 ? 'up' : successRate >= 80 ? 'flat' : 'down'}
        />
        <Kpi
          label="Week over week"
          value={`${Math.abs(wowDelta)}`}
          unit="%"
          hint={`${formatNumber(last7)} vs ${formatNumber(prev7)} prior 7d`}
          trend={wowDelta > 0 ? 'up' : wowDelta < 0 ? 'down' : 'flat'}
          delta={`${wowDelta > 0 ? '+' : ''}${wowDelta}%`}
        />
        <Kpi
          label="Bond coverage"
          value={`${bondCoverage}`}
          unit="%"
          hint={`${formatNumber(bondedCount)} of ${formatNumber(anchors.length)} anchors`}
          trend={bondCoverage >= 80 ? 'up' : 'flat'}
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card kicker="30 days" title="Execution volume — last 30 days">
          <VolumeTrend data={trend30} />
        </Card>
        <Card kicker="90 days" title="Execution volume — last 90 days">
          <VolumeTrend data={trend90} compact />
        </Card>
      </div>

      <Card kicker="Anchors" title="Top anchors by bond amount">
        <ul className="divide-y divide-[var(--keeta-line)]">
          {[...anchors]
            .map((a) => ({
              id: a.id,
              name: a.displayName ?? a.name ?? a.id,
              bond:
                typeof a.bondAmount === 'string'
                  ? Number.parseFloat(a.bondAmount)
                  : typeof a.bondAmount === 'number'
                    ? a.bondAmount
                    : 0,
            }))
            .sort((a, b) => b.bond - a.bond)
            .slice(0, 6)
            .map((a) => (
              <li key={a.id} className="flex items-center justify-between py-3 text-sm first:pt-0">
                <span className="font-medium text-[var(--keeta-ink)]">{a.name}</span>
                <span className="font-mono text-xs text-[var(--keeta-muted)]">
                  {a.bond > 0 ? a.bond.toLocaleString() : '—'}
                </span>
              </li>
            ))}
          {anchors.length === 0 ? (
            <li className="py-6 text-center text-sm text-[var(--keeta-muted)]">
              No anchors registered yet.
            </li>
          ) : null}
        </ul>
      </Card>
    </div>
  );
}
