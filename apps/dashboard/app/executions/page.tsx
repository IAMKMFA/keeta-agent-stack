import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber, shortId } from '../../lib/format';

type ExecutionRow = {
  id: string;
  intentId: string;
  adapterId: string;
  status: string;
  txHash?: string | null;
  blockHeight?: string | null;
  settlementState?: string | null;
  lifecycleState?: string | null;
  createdAt?: string;
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Executions — Keeta Agent Hub' };

export default async function Page() {
  const rows = await fetchJson<ExecutionRow[]>('/executions', []);
  const submitted = rows.filter((row) => ['submitted', 'pending'].includes(row.status)).length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const settled = rows.filter((row) => row.settlementState === 'confirmed').length;

  const tableRows = rows.map((r) => ({
    _key: r.id,
    id: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{shortId(r.id)}</div>
        <div className="font-mono text-[11px] text-[var(--keeta-muted)]">{r.id}</div>
      </div>
    ),
    status: (
      <StatusPill
        tone={
          r.status === 'failed'
            ? 'danger'
            : r.status === 'submitted' || r.status === 'pending'
              ? 'warning'
              : r.status === 'settled' || r.status === 'completed'
                ? 'success'
                : 'info'
        }
        dot={false}
      >
        {r.status}
      </StatusPill>
    ),
    intent: <span className="font-mono text-xs">{shortId(r.intentId)}</span>,
    adapter: r.adapterId,
    txHash: r.txHash ? <span className="font-mono text-xs">{shortId(r.txHash, 10)}</span> : '—',
    settlement: r.settlementState ?? '—',
    lifecycle: r.lifecycleState ?? '—',
    createdAt: <span className="font-mono text-xs">{formatDateTime(r.createdAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Settlement ledger"
        title="Executions"
        description="End-to-end execution records with adapter assignment, transaction references, and settlement state."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} total</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Total executions" value={formatNumber(rows.length)} hint="Latest first" />
        <Kpi
          label="In-flight"
          value={formatNumber(submitted)}
          hint="Pending or submitted"
          trend={submitted === 0 ? 'up' : 'flat'}
        />
        <Kpi
          label="Confirmed"
          value={formatNumber(settled)}
          hint="Settlement state confirmed"
          trend="up"
        />
        <Kpi
          label="Failures"
          value={formatNumber(failed)}
          hint="Needs operator triage"
          trend={failed === 0 ? 'up' : 'down'}
        />
      </KpiGrid>

      <Card kicker="Ledger" title="Recent executions" padding="sm">
        <DataTable
          columns={[
            { key: 'id', label: 'Execution ID' },
            { key: 'status', label: 'Status' },
            { key: 'intent', label: 'Intent' },
            { key: 'adapter', label: 'Adapter' },
            { key: 'txHash', label: 'Tx Hash' },
            { key: 'settlement', label: 'Settlement' },
            { key: 'lifecycle', label: 'Lifecycle' },
            { key: 'createdAt', label: 'Created' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No executions found yet."
        />
      </Card>
    </div>
  );
}
