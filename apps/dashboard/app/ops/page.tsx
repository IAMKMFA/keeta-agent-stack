import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

type MetricSample = {
  id: string;
  name: string;
  labels: Record<string, unknown>;
  value: number;
  capturedAt: string;
};

export default async function OpsPage() {
  const opsKey = process.env.NEXT_PUBLIC_OPS_API_KEY;
  const metrics = await fetchJson<{ samples: MetricSample[] }>(
    '/ops/metrics',
    { samples: [] },
    opsKey ? { headers: { 'x-ops-key': opsKey } } : undefined
  );
  const names = new Set(metrics.samples.map((sample) => sample.name));
  const maxValue = metrics.samples.length > 0 ? Math.max(...metrics.samples.map((sample) => sample.value)) : 0;

  const tableRows = metrics.samples.slice(0, 100).map((sample) => ({
    _key: sample.id,
    name: <span className="font-mono text-xs">{sample.name}</span>,
    value: <span className="font-mono text-xs">{sample.value}</span>,
    labels: <span className="font-mono text-[11px] text-[var(--hub-muted)]">{JSON.stringify(sample.labels)}</span>,
    captured: <span className="font-mono text-xs">{formatDateTime(sample.capturedAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Operations Center</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Operations</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Queue depth and policy signals from metric samples (requires API access; set OPS_API_KEY for secured
          endpoints).
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Metric samples" value={formatNumber(metrics.samples.length)} hint="Recent rows" />
        <StatusCard title="Unique metrics" value={formatNumber(names.size)} hint="Signal types" />
        <StatusCard title="Peak value" value={formatNumber(maxValue, 4)} hint="Visible window maximum" />
      </div>

      <section className="hub-soft-panel p-4">
        <DataTable
          columns={[
            { key: 'name', label: 'Name' },
            { key: 'value', label: 'Value' },
            { key: 'labels', label: 'Labels' },
            { key: 'captured', label: 'Captured' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage={
            opsKey
              ? 'No samples yet (worker metrics sampler writes periodically).'
              : 'No samples returned. If OPS key auth is enabled, set NEXT_PUBLIC_OPS_API_KEY for dashboard access.'
          }
        />
      </section>
    </div>
  );
}
