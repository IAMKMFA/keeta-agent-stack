import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import { emptyDashboardSummary, type DashboardSummary } from '../../../../lib/dashboard-summary';
import { ActivityFeed } from '../../../../components/ActivityFeed';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatNumber } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Backtesting — Keeta Agent Hub' };

export default async function BacktestPage() {
  requireV2Enabled();
  await requireScope('ops:read');
  const summary = await fetchJson<DashboardSummary>('/ops/dashboard-summary', emptyDashboardSummary);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Backtesting"
        title="Historical replay foundation"
        description="A monitoring and replay surface staged on stable Phase 1 data contracts before adding historical job orchestration."
        meta={
          <>
            <StatusPill tone="accent">Data-contract first</StatusPill>
            <Link href="/simulate" className="hub-pill px-3 py-1.5">
              Simulation Lab
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Recent intents" value={formatNumber(summary.intents.totalRecent)} />
        <Kpi label="Recent executions" value={formatNumber(summary.executions.totalRecent)} />
        <Kpi label="Policy decisions" value={formatNumber(summary.policy.decisions)} />
        <Kpi label="Simulation runs" value={formatNumber(summary.simulations.totalRecent)} />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card
          className="xl:col-span-2"
          kicker="Replay plan"
          title="Backtest workflow"
          description="The first durable workflow compares historical intents against policy packs and simulation presets."
        >
          <ol className="space-y-3 text-sm text-[var(--keeta-ink-subtle)]">
            <li className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              1. Select a time window and source strategy.
            </li>
            <li className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              2. Choose policy packs and simulation scenarios to compare.
            </li>
            <li className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              3. Queue replay work server-side, then stream audit events and metrics here.
            </li>
          </ol>
        </Card>

        <Card className="xl:col-span-3" kicker="Recent evidence" title="Replay candidates">
          <ActivityFeed events={summary.events} />
        </Card>
      </div>
    </div>
  );
}
