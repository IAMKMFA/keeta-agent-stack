import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber, shortId } from '../../lib/format';

type IntentRow = {
  id: string;
  walletId: string;
  strategyId: string | null;
  status: string;
  requiresApproval: boolean;
  approvalStatus: string;
  createdAt: string;
  updatedAt: string;
  payload: {
    baseAsset?: string;
    quoteAsset?: string;
    side?: string;
    size?: string;
  };
};

function statusTone(status: string): 'good' | 'warn' | 'neutral' {
  if (['executed', 'completed'].includes(status)) return 'good';
  if (['held', 'failed'].includes(status)) return 'warn';
  return 'neutral';
}

export default async function Page() {
  const rows = await fetchJson<IntentRow[]>('/intents', []);
  const pending = rows.filter((row) => row.approvalStatus === 'pending').length;
  const held = rows.filter((row) => row.status === 'held').length;
  const routed = rows.filter((row) => ['routed', 'policy_checked', 'quoted'].includes(row.status)).length;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: (
      <div className="space-y-1">
        <div className="font-mono text-xs">{shortId(row.id)}</div>
        <div className="font-mono text-[11px] text-[var(--hub-muted)]">{row.id}</div>
      </div>
    ),
    pair: `${row.payload?.baseAsset ?? '—'} / ${row.payload?.quoteAsset ?? '—'}`,
    side: `${row.payload?.side ?? '—'} ${row.payload?.size ?? ''}`.trim(),
    status: (
      <span
        className={`inline-flex rounded-full border px-2 py-1 text-xs ${
          row.status === 'held'
            ? 'border-[rgba(190,63,67,0.45)] bg-[rgba(190,63,67,0.1)] text-[var(--hub-danger)]'
            : row.status === 'created'
              ? 'border-[var(--hub-line)] bg-white text-[#555]'
              : 'border-[rgba(50,149,144,0.42)] bg-[rgba(50,149,144,0.12)] text-[#1e6662]'
        }`}
      >
        {row.status}
      </span>
    ),
    approval: row.requiresApproval ? row.approvalStatus : 'not required',
    wallet: <span className="font-mono text-xs">{shortId(row.walletId)}</span>,
    updated: <span className="font-mono text-xs">{formatDateTime(row.updatedAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Execution Pipeline</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Intents</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Source-of-truth intent queue with approval and lifecycle progression visibility.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-2 xl:grid-cols-4">
        <StatusCard title="Total intents" value={formatNumber(rows.length)} hint="Latest first" />
        <StatusCard
          title="Pending approval"
          value={formatNumber(pending)}
          hint="Requires manual sign-off"
          tone={pending > 0 ? 'warn' : 'good'}
        />
        <StatusCard title="Routed / policy" value={formatNumber(routed)} hint="Ready for execution" />
        <StatusCard
          title="Held"
          value={formatNumber(held)}
          hint="Paused by operations"
          tone={statusTone(held > 0 ? 'held' : 'created')}
        />
      </div>

      <section className="hub-soft-panel p-4">
        <DataTable
          columns={[
            { key: 'id', label: 'Intent ID' },
            { key: 'pair', label: 'Pair' },
            { key: 'side', label: 'Side / Size' },
            { key: 'status', label: 'Status' },
            { key: 'approval', label: 'Approval' },
            { key: 'wallet', label: 'Wallet' },
            { key: 'updated', label: 'Updated' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No intents found. Submit one through the API or SDK to populate this table."
        />
      </section>
    </div>
  );
}
