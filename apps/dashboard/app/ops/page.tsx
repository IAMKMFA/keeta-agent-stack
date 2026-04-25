import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';
export const metadata = { title: 'Operations — Keeta Agent Hub' };

type MetricSample = {
  id: string;
  name: string;
  labels: Record<string, unknown>;
  value: number;
  capturedAt: string;
};

export default async function OpsPage() {
  const opsKey = process.env.OPS_API_KEY;
  const metrics = await fetchJson<{ samples: MetricSample[] }>(
    '/ops/metrics',
    { samples: [] },
    opsKey ? { headers: { 'x-ops-key': opsKey } } : undefined
  );
  const names = new Set(metrics.samples.map((sample) => sample.name));
  const maxValue =
    metrics.samples.length > 0 ? Math.max(...metrics.samples.map((sample) => sample.value)) : 0;

  const tableRows = metrics.samples.slice(0, 100).map((sample) => ({
    _key: sample.id,
    name: <span className="font-mono text-xs">{sample.name}</span>,
    value: <span className="font-mono text-xs">{sample.value}</span>,
    labels: (
      <span className="font-mono text-[11px] text-[var(--keeta-muted)]">
        {JSON.stringify(sample.labels)}
      </span>
    ),
    captured: <span className="font-mono text-xs">{formatDateTime(sample.capturedAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Operations center"
        title="Operations"
        description="Queue depth and policy signals from metric samples. Secured by server-only OPS_API_KEY."
        meta={
          <StatusPill tone={opsKey ? 'success' : 'warning'} dot={false}>
            {opsKey ? 'OPS_API_KEY configured' : 'OPS_API_KEY missing'}
          </StatusPill>
        }
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Metric samples"
          value={formatNumber(metrics.samples.length)}
          hint="Recent rows"
        />
        <Kpi label="Unique metrics" value={formatNumber(names.size)} hint="Signal types" />
        <Kpi label="Peak value" value={formatNumber(maxValue, 4)} hint="Visible window maximum" />
      </KpiGrid>

      <Card kicker="Samples" title="Recent metric samples" padding="sm">
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
              : 'No samples returned. If OPS key auth is enabled, set OPS_API_KEY (server-only, no NEXT_PUBLIC_ prefix) on the dashboard host.'
          }
        />
      </Card>
    </div>
  );
}
