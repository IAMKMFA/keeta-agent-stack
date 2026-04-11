import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
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

export default async function Page() {
  const rows = await fetchJson<SimulationRow[]>('/simulations', []);
  const completed = rows.filter((row) => row.status === 'completed').length;
  const pending = rows.filter((row) => row.status === 'pending').length;
  const shadowMode = rows.filter((row) => row.scenario?.fidelityMode === 'shadow').length;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: (
      <div className="space-y-1">
        <div className="font-mono text-xs">{shortId(row.id)}</div>
        <div className="font-mono text-[11px] text-[var(--hub-muted)]">{row.id}</div>
      </div>
    ),
    intent: <span className="font-mono text-xs">{shortId(row.intentId)}</span>,
    route: row.routePlanId ? <span className="font-mono text-xs">{shortId(row.routePlanId)}</span> : '—',
    status: (
      <span
        className={`inline-flex rounded-full border px-2 py-1 text-xs ${
          row.status === 'completed'
            ? 'border-[rgba(50,149,144,0.42)] bg-[rgba(50,149,144,0.12)] text-[#1d635f]'
            : row.status === 'failed'
              ? 'border-[rgba(190,63,67,0.45)] bg-[rgba(190,63,67,0.1)] text-[var(--hub-danger)]'
              : 'border-[rgba(204,147,56,0.4)] bg-[rgba(204,147,56,0.09)] text-[#91661d]'
        }`}
      >
        {row.status}
      </span>
    ),
    fidelity: row.scenario?.fidelityMode ?? 'standard',
    latency: row.scenario?.latencyMs ?? '—',
    createdAt: <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Simulation Engine</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Simulations</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Shadow and replay evaluation queue for pre-trade confidence before execution.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Total runs" value={formatNumber(rows.length)} hint="Simulation jobs" />
        <StatusCard title="Completed" value={formatNumber(completed)} hint="Finished runs" tone="good" />
        <StatusCard
          title="Pending"
          value={formatNumber(pending)}
          hint="Queued / in progress"
          tone={pending > 0 ? 'warn' : 'neutral'}
        />
        <StatusCard title="Shadow mode" value={formatNumber(shadowMode)} hint="Live chain context attached" />
      </div>

      <section className="hub-soft-panel p-4">
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
      </section>
    </div>
  );
}
