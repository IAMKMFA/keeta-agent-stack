import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson, isApiConfigured } from '../../../../lib/api';
import { emptyDashboardSummary, type DashboardSummary } from '../../../../lib/dashboard-summary';
import { ActivityFeed } from '../../../../components/ActivityFeed';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatDateTime, formatNumber } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Dashboard — Keeta Agent Hub' };

function ModeBreakdown({ values }: { values: Record<string, number> }) {
  const entries = Object.entries(values).sort((a, b) => b[1] - a[1]);
  if (entries.length === 0) {
    return <p className="text-sm text-[var(--keeta-muted)]">No simulation runs yet.</p>;
  }
  return (
    <div className="space-y-2">
      {entries.map(([mode, count]) => (
        <div key={mode} className="flex items-center justify-between gap-3 text-sm">
          <span className="capitalize text-[var(--keeta-ink)]">{mode}</span>
          <span className="font-mono text-xs text-[var(--keeta-muted)]">{formatNumber(count)}</span>
        </div>
      ))}
    </div>
  );
}

export default async function DashboardPage() {
  requireV2Enabled();
  const viewer = await requireScope('ops:read');
  const summary = await fetchJson<DashboardSummary>('/ops/dashboard-summary', emptyDashboardSummary);
  const apiReady = isApiConfigured();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Cockpit"
        title={`Autonomous execution cockpit${viewer.displayName ? ` for ${viewer.displayName}` : ''}`}
        description="A product-grade home for agents, policy, simulation, routing, live events, and operational risk."
        meta={
          <>
            <StatusPill tone={apiReady ? 'success' : 'danger'}>
              {apiReady ? 'API linked' : 'API missing'}
            </StatusPill>
            <StatusPill tone={summary.adapters.degraded === 0 ? 'success' : 'danger'}>
              {summary.adapters.degraded === 0 ? 'Adapters healthy' : `${summary.adapters.degraded} degraded`}
            </StatusPill>
            <StatusPill tone="neutral">Updated {formatDateTime(summary.generatedAt)}</StatusPill>
          </>
        }
      />

      <KpiGrid columns={6}>
        <Kpi
          label="Active agents"
          value={formatNumber(summary.agents.active)}
          hint={`${formatNumber(summary.agents.paused)} paused · ${formatNumber(summary.agents.templates)} templates`}
          trend={summary.agents.active > 0 ? 'up' : 'flat'}
        />
        <Kpi
          label="Intents / 24h"
          value={formatNumber(summary.intents.last24h)}
          hint={`${formatNumber(summary.intents.totalRecent)} recent rows`}
        />
        <Kpi
          label="Executions / 24h"
          value={formatNumber(summary.executions.last24h)}
          hint={`${formatNumber(summary.executions.unsettled)} unsettled`}
        />
        <Kpi
          label="Success rate"
          value={formatNumber(summary.executions.successRate, 1)}
          unit="%"
          hint={`${formatNumber(summary.executions.succeeded)} succeeded · ${formatNumber(summary.executions.failed)} failed`}
          trend={summary.executions.successRate >= 95 ? 'up' : summary.executions.successRate >= 80 ? 'flat' : 'down'}
        />
        <Kpi
          label="Policy denials"
          value={formatNumber(summary.policy.blocked)}
          hint={`${formatNumber(summary.policy.blockRate, 1)}% block rate`}
          trend={summary.policy.blockRate < 5 ? 'up' : summary.policy.blockRate < 15 ? 'flat' : 'down'}
        />
        <Kpi
          label="Simulations"
          value={formatNumber(summary.simulations.totalRecent)}
          hint={`${formatNumber(summary.simulations.completed)} completed`}
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card
          className="xl:col-span-2"
          kicker="Activity"
          title="Live operational activity"
          description="Recent audit events from the execution fabric. The full realtime feed remains available in Live Execution."
          actions={
            <Link href="/live" className="hub-pill px-3 py-1.5">
              Open stream
            </Link>
          }
        >
          <ActivityFeed events={summary.events} />
        </Card>

        <Card
          kicker="Simulation fidelity"
          title="Scenario mix"
          description="Recent simulation runs grouped by scenario fidelity."
          actions={
            <Link href="/simulate" className="hub-pill px-3 py-1.5">
              Open lab
            </Link>
          }
        >
          <ModeBreakdown values={summary.simulations.fidelityModes} />
        </Card>
      </div>

      <div className="grid gap-4 lg:grid-cols-3">
        <Card
          kicker="Agents"
          title="Agent readiness"
          description="Strategies are treated as the persisted agent model for this cockpit pass."
          actions={
            <Link href="/agents" className="hub-pill px-3 py-1.5">
              Agent Studio
            </Link>
          }
        >
          <div className="space-y-2">
            {summary.agents.recent.length === 0 ? (
              <p className="text-sm text-[var(--keeta-muted)]">No agent strategies found.</p>
            ) : (
              summary.agents.recent.map((agent) => (
                <Link
                  key={agent.id}
                  href={`/agents/${agent.id}`}
                  className="flex items-center justify-between gap-3 rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3 text-sm transition hover:bg-[rgba(50,149,144,0.06)]"
                >
                  <span className="font-medium text-[var(--keeta-ink)]">{agent.name}</span>
                  <StatusPill tone={agent.paused ? 'warning' : 'success'} dot={false}>
                    {agent.paused ? 'paused' : 'running'}
                  </StatusPill>
                </Link>
              ))
            )}
          </div>
        </Card>

        <Card kicker="Policy" title="Decision posture">
          <div className="space-y-3 text-sm">
            <div className="flex justify-between">
              <span className="text-[var(--keeta-muted)]">Allowed</span>
              <span className="font-mono">{formatNumber(summary.policy.allowed)}</span>
            </div>
            <div className="flex justify-between">
              <span className="text-[var(--keeta-muted)]">Blocked</span>
              <span className="font-mono">{formatNumber(summary.policy.blocked)}</span>
            </div>
            <Link href="/policy/builder" className="inline-flex text-sm font-medium text-[var(--keeta-accent-deep)]">
              Open builder foundation
            </Link>
          </div>
        </Card>

        <Card kicker="Risk" title="What to inspect next">
          <div className="space-y-2 text-sm text-[var(--keeta-ink-subtle)]">
            <Link href="/backtest" className="block rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Backtest historical intents
            </Link>
            <Link href="/webhooks" className="block rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Review webhook delivery health
            </Link>
            <Link href="/cost" className="block rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Inspect fees and cost drift
            </Link>
          </div>
        </Card>
      </div>
    </div>
  );
}
