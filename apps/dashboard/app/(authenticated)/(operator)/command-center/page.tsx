import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson, isApiConfigured } from '../../../../lib/api';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatDateTime, formatNumber } from '../../../../lib/format';
import { KillSwitchPanel } from '../../../../components/command-center/KillSwitchPanel';
import { PipelineFunnel } from '../../../../components/command-center/PipelineFunnel';
import { IncidentList } from '../../../../components/command-center/IncidentList';
import { ChainHealthCard } from '../../../../components/command-center/ChainHealthCard';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Command Center — Keeta Agent Hub' };

type Modes = {
  liveMode: boolean;
  keetaNetwork: string;
  mockAdapters: boolean;
  executionKillSwitch: boolean;
};

type ChainHealth = {
  ok: boolean;
  network: string;
  measuredAt?: string;
  latencyMs: number;
  apiLatencyMs?: number;
  ledger?: { blockCount: number; transactionCount: number; representativeCount: number };
  errorMessage?: string;
  networkInfo?: { baseToken: string; networkAddress: string } | null;
};

type AdapterHealth = { adapterId: string; ok: boolean; latencyMs?: number; checkedAt?: string };
type IntentRow = { id: string; status: string; approvalStatus: string; createdAt: string };
type ExecutionRow = {
  id: string;
  intentId?: string;
  status: string;
  createdAt: string;
  completedAt?: string | null;
};
type RouteRow = { score: number; createdAt: string };
type PolicyDecision = { outcome: string; decidedAt?: string; createdAt?: string };

function windowCount<T extends { createdAt: string }>(rows: T[], hours: number): number {
  const cutoff = Date.now() - hours * 3_600_000;
  return rows.filter((r) => {
    const t = Date.parse(r.createdAt);
    return Number.isFinite(t) && t >= cutoff;
  }).length;
}

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
}

export default async function CommandCenterPage() {
  requireV2Enabled();
  const viewer = await requireScope('ops:read');

  const [modes, intents, executions, routes, chain, adapterHealth, decisions] =
    await Promise.all([
      fetchJson<Modes>('/config/modes', {
        liveMode: false,
        keetaNetwork: 'test',
        mockAdapters: true,
        executionKillSwitch: false,
      }),
      fetchJson<IntentRow[]>('/intents', []),
      fetchJson<ExecutionRow[]>('/executions', []),
      fetchJson<RouteRow[]>('/routes', []),
      fetchJson<ChainHealth | null>('/chain/health', null),
      fetchJson<AdapterHealth[]>('/adapters/health', []),
      fetchJson<PolicyDecision[]>('/policy/decisions?limit=200', []),
    ]);

  const intents24h = windowCount(intents, 24);
  const executions24h = windowCount(executions, 24);
  const succeeded = executions.filter((e) => e.status === 'settled' || e.status === 'completed');
  const failed = executions.filter(
    (e) => e.status === 'failed' || e.status === 'reverted' || e.status === 'cancelled'
  );
  const successRate =
    executions.length > 0
      ? Math.round((succeeded.length / (succeeded.length + failed.length || 1)) * 1000) / 10
      : 0;
  const settlementLatencies = succeeded
    .map((e) =>
      e.createdAt && e.completedAt
        ? (Date.parse(e.completedAt) - Date.parse(e.createdAt)) / 1000
        : NaN
    )
    .filter((n): n is number => Number.isFinite(n));
  const medianLatency = median(settlementLatencies);
  const blocked = decisions.filter((d) => d.outcome === 'blocked' || d.outcome === 'deny').length;
  const blockRate =
    decisions.length > 0 ? Math.round((blocked / decisions.length) * 1000) / 10 : 0;
  const unsettled = executions.filter((e) =>
    ['pending', 'submitted', 'queued'].includes(e.status)
  ).length;
  const adapterFailures = adapterHealth.filter((h) => !h.ok).length;
  const heldIntents = intents.filter((i) => i.status === 'held').length;
  const pendingApprovals = intents.filter((i) => i.approvalStatus === 'pending').length;

  const apiReady = isApiConfigured();

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Command Center"
        title={`Welcome back${viewer.displayName ? `, ${viewer.displayName}` : ''}`}
        description="Global health, pipeline throughput, policy signals, and the admin kill switch — the operator's single pane of glass."
        meta={
          <>
            <StatusPill tone={apiReady ? 'success' : 'danger'}>
              {apiReady ? 'API linked' : 'API missing'}
            </StatusPill>
            <StatusPill tone={modes.liveMode ? 'warning' : 'info'}>
              {modes.liveMode ? 'Live mode' : 'Sim / dry-run'}
            </StatusPill>
            <StatusPill tone="neutral">Network: {modes.keetaNetwork}</StatusPill>
            <StatusPill tone={modes.mockAdapters ? 'info' : 'success'}>
              {modes.mockAdapters ? 'Mock adapters' : 'Production adapters'}
            </StatusPill>
            {modes.executionKillSwitch ? (
              <StatusPill tone="danger">Kill switch enabled</StatusPill>
            ) : null}
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Intents / 24h" value={formatNumber(intents24h)} hint={`${formatNumber(intents.length)} all-time`} />
        <Kpi label="Executions / 24h" value={formatNumber(executions24h)} hint={`${formatNumber(unsettled)} unsettled`} />
        <Kpi
          label="Success rate"
          value={`${successRate}`}
          unit="%"
          hint={`${formatNumber(succeeded.length)} succeeded · ${formatNumber(failed.length)} failed`}
          trend={successRate >= 95 ? 'up' : successRate >= 80 ? 'flat' : 'down'}
        />
        <Kpi
          label="Median settlement"
          value={medianLatency != null ? medianLatency.toFixed(1) : '—'}
          unit={medianLatency != null ? 's' : undefined}
          hint={`${formatNumber(settlementLatencies.length)} recent settlements`}
        />
        <Kpi
          label="Policy block rate"
          value={`${blockRate}`}
          unit="%"
          hint={`${formatNumber(blocked)} of ${formatNumber(decisions.length)} decisions`}
          trend={blockRate < 5 ? 'up' : blockRate < 15 ? 'flat' : 'down'}
        />
        <Kpi
          label="Held intents"
          value={formatNumber(heldIntents)}
          hint={`${formatNumber(pendingApprovals)} pending approval`}
          trend={heldIntents === 0 ? 'up' : 'flat'}
        />
        <Kpi
          label="Adapter health"
          value={adapterFailures === 0 ? 'All healthy' : `${formatNumber(adapterFailures)} degraded`}
          hint={`${formatNumber(adapterHealth.length)} adapters monitored`}
          trend={adapterFailures === 0 ? 'up' : 'down'}
        />
        <Kpi
          label="Latest intent"
          value={intents[0] ? formatDateTime(intents[0].createdAt) : '—'}
          hint={intents[0]?.status ?? 'No intents yet'}
          size="sm"
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-3">
        <div className="xl:col-span-2">
          <Card kicker="Pipeline" title="Intent → Route → Policy → Execute → Settle">
            <PipelineFunnel
              intents={intents.length}
              routes={routes.length}
              decided={decisions.length}
              executed={executions.length}
              settled={succeeded.length}
            />
          </Card>
        </div>
        <KillSwitchPanel
          engaged={modes.executionKillSwitch}
          canWrite={viewer.scopes.includes('kill_switch:write')}
        />
      </div>

      <div className="grid gap-4 xl:grid-cols-2">
        <ChainHealthCard chain={chain} />
        <IncidentList
          adapterHealth={adapterHealth}
          recentFailures={failed.slice(0, 5)}
          chainOk={chain?.ok ?? false}
        />
      </div>
    </div>
  );
}
