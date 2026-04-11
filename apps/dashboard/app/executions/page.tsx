import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
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

export default async function Page() {
  const rows = await fetchJson<ExecutionRow[]>('/executions', []);
  const submitted = rows.filter((row) => ['submitted', 'pending'].includes(row.status)).length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const settled = rows.filter((row) => row.settlementState === 'confirmed').length;

  const tableRows = rows.map((r) => ({
    _key: r.id,
    id: (
      <div className="space-y-1">
        <div className="font-mono text-xs">{shortId(r.id)}</div>
        <div className="font-mono text-[11px] text-[var(--hub-muted)]">{r.id}</div>
      </div>
    ),
    status: (
      <span
        className={`inline-flex rounded-full border px-2 py-1 text-xs ${
          r.status === 'failed'
            ? 'border-[rgba(190,63,67,0.45)] bg-[rgba(190,63,67,0.1)] text-[var(--hub-danger)]'
            : r.status === 'submitted' || r.status === 'pending'
              ? 'border-[rgba(204,147,56,0.4)] bg-[rgba(204,147,56,0.09)] text-[#91661d]'
              : 'border-[rgba(50,149,144,0.42)] bg-[rgba(50,149,144,0.12)] text-[#1d635f]'
        }`}
      >
        {r.status}
      </span>
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
      <div>
        <div className="hub-kicker">Settlement Ledger</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Executions</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          End-to-end execution records with adapter assignment, transaction references, and settlement state.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Total executions" value={formatNumber(rows.length)} hint="Latest first" />
        <StatusCard
          title="In-flight"
          value={formatNumber(submitted)}
          hint="Pending or submitted"
          tone={submitted > 0 ? 'warn' : 'good'}
        />
        <StatusCard
          title="Confirmed"
          value={formatNumber(settled)}
          hint="Settlement state confirmed"
          tone={settled > 0 ? 'good' : 'neutral'}
        />
        <StatusCard
          title="Failures"
          value={formatNumber(failed)}
          hint="Needs operator triage"
          tone={failed > 0 ? 'danger' : 'good'}
        />
      </div>

      <p className="text-sm text-[var(--hub-muted)]">
        Settlement fields populate from live Keeta transfers executed by the worker (see tx hash / explorer
        URL on the execution payload).
      </p>

      <section className="hub-soft-panel p-4">
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
      </section>
    </div>
  );
}
