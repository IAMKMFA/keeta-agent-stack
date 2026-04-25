import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
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
    policyPackId?: string;
    effectivePolicyPackId?: string;
  };
};

function statusToneFor(status: string): 'success' | 'warning' | 'danger' | 'neutral' | 'info' {
  if (['executed', 'completed', 'settled'].includes(status)) return 'success';
  if (['failed', 'cancelled', 'reverted'].includes(status)) return 'danger';
  if (['held'].includes(status)) return 'warning';
  if (['routed', 'policy_checked', 'quoted', 'submitted'].includes(status)) return 'info';
  return 'neutral';
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Intents — Keeta Agent Hub' };

export default async function Page() {
  const rows = await fetchJson<IntentRow[]>('/intents', []);
  const pending = rows.filter((row) => row.approvalStatus === 'pending').length;
  const held = rows.filter((row) => row.status === 'held').length;
  const routed = rows.filter((row) =>
    ['routed', 'policy_checked', 'quoted'].includes(row.status)
  ).length;

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{shortId(row.id)}</div>
        <div className="font-mono text-[11px] text-[var(--keeta-muted)]">{row.id}</div>
      </div>
    ),
    pair: `${row.payload?.baseAsset ?? '—'} / ${row.payload?.quoteAsset ?? '—'}`,
    side: `${row.payload?.side ?? '—'} ${row.payload?.size ?? ''}`.trim(),
    status: (
      <StatusPill tone={statusToneFor(row.status)} dot={false}>
        {row.status}
      </StatusPill>
    ),
    approval: row.requiresApproval ? (
      <StatusPill
        tone={
          row.approvalStatus === 'pending'
            ? 'warning'
            : row.approvalStatus === 'approved'
              ? 'success'
              : row.approvalStatus === 'rejected'
                ? 'danger'
                : 'neutral'
        }
        dot={false}
      >
        {row.approvalStatus}
      </StatusPill>
    ) : (
      <span className="text-xs text-[var(--keeta-muted)]">not required</span>
    ),
    policyPack: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">
          {row.payload?.effectivePolicyPackId
            ? shortId(row.payload.effectivePolicyPackId)
            : row.payload?.policyPackId
              ? shortId(row.payload.policyPackId)
              : '—'}
        </div>
        <div className="text-[11px] text-[var(--keeta-muted)]">
          {row.payload?.effectivePolicyPackId
            ? 'effective'
            : row.payload?.policyPackId
              ? 'selected'
              : 'none'}
        </div>
      </div>
    ),
    wallet: <span className="font-mono text-xs">{shortId(row.walletId)}</span>,
    updated: <span className="font-mono text-xs">{formatDateTime(row.updatedAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Execution pipeline"
        title="Intents"
        description="Source-of-truth intent queue with approval state and lifecycle progression."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} total</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Total intents" value={formatNumber(rows.length)} hint="Latest first" />
        <Kpi
          label="Pending approval"
          value={formatNumber(pending)}
          hint="Requires manual sign-off"
          trend={pending === 0 ? 'up' : 'flat'}
        />
        <Kpi label="Routed / policy" value={formatNumber(routed)} hint="Ready for execution" />
        <Kpi
          label="Held"
          value={formatNumber(held)}
          hint="Paused by operations"
          trend={held === 0 ? 'up' : 'down'}
        />
      </KpiGrid>

      <Card kicker="Queue" title="Recent intents" padding="sm">
        <DataTable
          columns={[
            { key: 'id', label: 'Intent ID' },
            { key: 'pair', label: 'Pair' },
            { key: 'side', label: 'Side / Size' },
            { key: 'status', label: 'Status' },
            { key: 'approval', label: 'Approval' },
            { key: 'policyPack', label: 'Policy Pack' },
            { key: 'wallet', label: 'Wallet' },
            { key: 'updated', label: 'Updated' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No intents found. Submit one through the API or SDK to populate this table."
        />
      </Card>
    </div>
  );
}
