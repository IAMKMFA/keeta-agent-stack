import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

type AdapterInfo = { id: string; kind: string };
type AdapterHealth = {
  adapterId: string;
  ok: boolean;
  latencyMs?: number;
  message?: string;
  checkedAt?: string;
};

export default async function Page() {
  const [adapters, healthRows] = await Promise.all([
    fetchJson<AdapterInfo[]>('/adapters', []),
    fetchJson<AdapterHealth[]>('/adapters/health', []),
  ]);

  const healthById = new Map(healthRows.map((entry) => [entry.adapterId, entry]));
  const healthy = healthRows.filter((entry) => entry.ok).length;

  const tableRows = adapters.map((adapter) => {
    const health = healthById.get(adapter.id);
    return {
      _key: adapter.id,
      id: <span className="font-mono text-xs">{adapter.id}</span>,
      kind: adapter.kind,
      health: health ? (
        <span
          className={`inline-flex rounded-full border px-2 py-1 text-xs ${
            health.ok
              ? 'border-[rgba(50,149,144,0.42)] bg-[rgba(50,149,144,0.12)] text-[#1d635f]'
              : 'border-[rgba(190,63,67,0.45)] bg-[rgba(190,63,67,0.1)] text-[var(--hub-danger)]'
          }`}
        >
          {health.ok ? 'ok' : 'degraded'}
        </span>
      ) : (
        'unknown'
      ),
      latency: health?.latencyMs ?? '—',
      checked: <span className="font-mono text-xs">{formatDateTime(health?.checkedAt)}</span>,
      note: health?.message ?? '—',
    };
  });

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Adapter Mesh</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Adapters</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Registered venue adapters and their latest health-check telemetry.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Registered adapters" value={formatNumber(adapters.length)} hint="Registry entries" />
        <StatusCard title="Healthy" value={formatNumber(healthy)} hint="Latest health check" tone="good" />
        <StatusCard
          title="Degraded"
          value={formatNumber(Math.max(healthRows.length - healthy, 0))}
          hint="Needs adapter review"
          tone={healthRows.length - healthy > 0 ? 'warn' : 'good'}
        />
      </div>

      <section className="hub-soft-panel p-4">
        <DataTable
          columns={[
            { key: 'id', label: 'Adapter ID' },
            { key: 'kind', label: 'Kind' },
            { key: 'health', label: 'Health' },
            { key: 'latency', label: 'Latency (ms)' },
            { key: 'checked', label: 'Checked' },
            { key: 'note', label: 'Message' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No adapters registered."
        />
      </section>
    </div>
  );
}
