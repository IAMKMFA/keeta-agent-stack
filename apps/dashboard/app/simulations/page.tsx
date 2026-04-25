import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber, shortId } from '../../lib/format';

type SimulationRow = {
  id: string;
  intentId: string;
  routePlanId: string | null;
  status: string;
  scenario: {
    fidelityMode?: string;
    latencyMs?: number;
    volatility?: number;
  };
  createdAt: string;
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulations — Keeta Agent Hub' };

export default async function Page() {
  const rows = await fetchJson<SimulationRow[]>('/simulations', []);
  const completed = rows.filter((row) => row.status === 'completed').length;
  const pending = rows.filter((row) => row.status === 'pending').length;
  const shadowMode = rows.filter((row) => row.scenario?.fidelityMode === 'shadow').length;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{shortId(row.id)}</div>
        <div className="font-mono text-[11px] text-[var(--keeta-muted)]">{row.id}</div>
      </div>
    ),
    intent: <span className="font-mono text-xs">{shortId(row.intentId)}</span>,
    route: row.routePlanId ? (
      <span className="font-mono text-xs">{shortId(row.routePlanId)}</span>
    ) : (
      '—'
    ),
    status: (
      <StatusPill
        tone={
          row.status === 'completed' ? 'success' : row.status === 'failed' ? 'danger' : 'warning'
        }
        dot={false}
      >
        {row.status}
      </StatusPill>
    ),
    fidelity: row.scenario?.fidelityMode ?? 'standard',
    latency: row.scenario?.latencyMs ?? '—',
    createdAt: <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Simulation engine"
        title="Simulations"
        description="Shadow and replay evaluation queue for pre-trade confidence before execution."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} total</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Total runs" value={formatNumber(rows.length)} hint="Simulation jobs" />
        <Kpi label="Completed" value={formatNumber(completed)} hint="Finished runs" trend="up" />
        <Kpi
          label="Pending"
          value={formatNumber(pending)}
          hint="Queued / in progress"
          trend={pending === 0 ? 'up' : 'flat'}
        />
        <Kpi
          label="Shadow mode"
          value={formatNumber(shadowMode)}
          hint="Live chain context attached"
        />
      </KpiGrid>

      <Card kicker="Runs" title="Recent simulations" padding="sm">
        <DataTable
          columns={[
            { key: 'id', label: 'Run ID' },
            { key: 'intent', label: 'Intent' },
            { key: 'route', label: 'Route' },
            { key: 'status', label: 'Status' },
            { key: 'fidelity', label: 'Fidelity' },
            { key: 'latency', label: 'Latency (ms)' },
            { key: 'createdAt', label: 'Created' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No simulation runs yet. Queue one using /simulations/run."
        />
      </Card>
    </div>
  );
}
