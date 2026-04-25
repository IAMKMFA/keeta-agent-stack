import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
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

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Adapters — Keeta Agent Hub' };

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
        <StatusPill tone={health.ok ? 'success' : 'danger'} dot={false}>
          {health.ok ? 'ok' : 'degraded'}
        </StatusPill>
      ) : (
        <StatusPill tone="neutral" dot={false}>
          unknown
        </StatusPill>
      ),
      latency: health?.latencyMs ?? '—',
      checked: <span className="font-mono text-xs">{formatDateTime(health?.checkedAt)}</span>,
      note: health?.message ?? '—',
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Adapter mesh"
        title="Adapters"
        description="Registered venue adapters and their latest health-check telemetry."
        meta={<StatusPill tone="info">{formatNumber(adapters.length)} registered</StatusPill>}
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Registered adapters"
          value={formatNumber(adapters.length)}
          hint="Registry entries"
        />
        <Kpi label="Healthy" value={formatNumber(healthy)} hint="Latest health check" trend="up" />
        <Kpi
          label="Degraded"
          value={formatNumber(Math.max(healthRows.length - healthy, 0))}
          hint="Needs adapter review"
          trend={healthRows.length - healthy === 0 ? 'up' : 'down'}
        />
      </KpiGrid>

      <Card kicker="Health" title="Adapter registry" padding="sm">
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
      </Card>
    </div>
  );
}
