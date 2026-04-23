import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Payment anchors — Keeta Agent Hub' };

type AnchorRow = {
  id: string;
  adapterId: string;
  label: string;
  status: string;
  corridorKey?: string;
  commercialTerms?: {
    setupFeeNote?: string;
    volumeFeeBps?: number;
  };
  currentBond?: {
    amountAtomic: string;
    assetId: string;
    delayDays: number;
    status: string;
    lockTxHash?: string;
    verified?: boolean;
  };
  readiness: {
    status: 'ready' | 'needs_attention' | 'blocked';
    canActivate: boolean;
    canServeLiveTraffic: boolean;
    nextRecommendedStatus?: string;
    issues: Array<{
      code: string;
      severity: 'warning' | 'blocking';
      message: string;
    }>;
  };
  operatorMetrics?: {
    successRate?: number;
    p50LatencyMs?: number;
    p95LatencyMs?: number;
    unsettledVolume?: number;
    bondAgeDays?: number;
    bondVerified?: boolean;
    sampledAt?: string;
  };
  updatedAt: string;
};

function txHref(hash?: string): string | null {
  const template = process.env.KEETA_EXPLORER_TX_URL_TEMPLATE ?? process.env.NEXT_PUBLIC_KEETA_EXPLORER_TX_URL_TEMPLATE;
  if (!template || !hash) return null;
  return template.replace('{hash}', hash);
}

export default async function Page() {
  const anchors = await fetchJson<AnchorRow[]>('/anchors', []);
  const active = anchors.filter((anchor) => anchor.status === 'active').length;
  const bonded = anchors.filter((anchor) => anchor.currentBond?.status === 'active').length;
  const liveReady = anchors.filter((anchor) => anchor.readiness?.canServeLiveTraffic).length;

  const tableRows = anchors.map((anchor) => {
    const href = txHref(anchor.currentBond?.lockTxHash);
    return {
      _key: anchor.id,
      label: (
        <div>
          <div className="font-medium text-[var(--hub-ink)]">{anchor.label}</div>
          <div className="font-mono text-[11px] text-[var(--hub-muted)]">{anchor.adapterId}</div>
        </div>
      ),
      corridor: anchor.corridorKey ?? '—',
      status: (
        <StatusPill
          tone={anchor.status === 'active' ? 'success' : 'neutral'}
          dot={false}
        >
          {anchor.status}
        </StatusPill>
      ),
      bond: anchor.currentBond ? `${anchor.currentBond.amountAtomic} ${anchor.currentBond.assetId}` : '—',
      delay: anchor.currentBond ? `${anchor.currentBond.delayDays}d` : '—',
      bondStatus: anchor.currentBond ? (
        <StatusPill
          tone={
            anchor.currentBond.verified
              ? 'success'
              : anchor.currentBond.status === 'active'
                ? 'info'
                : 'warning'
          }
          dot={false}
        >
          {anchor.currentBond.status}
          {anchor.currentBond.verified ? ' / verified' : ''}
        </StatusPill>
      ) : (
        <StatusPill tone="danger" dot={false}>
          missing
        </StatusPill>
      ),
      readiness: (
        <div className="space-y-1">
          <StatusPill
            tone={
              anchor.readiness.status === 'ready'
                ? 'success'
                : anchor.readiness.status === 'needs_attention'
                  ? 'warning'
                  : 'danger'
            }
            dot={false}
          >
            {anchor.readiness.status.replace('_', ' ')}
          </StatusPill>
          <div className="max-w-[20rem] text-xs text-[var(--keeta-muted)]">
            {anchor.readiness.issues[0]?.message ??
              (anchor.readiness.canServeLiveTraffic
                ? 'Eligible for live traffic.'
                : anchor.readiness.nextRecommendedStatus
                  ? `Next: ${anchor.readiness.nextRecommendedStatus}`
                  : 'No readiness guidance available.')}
          </div>
        </div>
      ),
      operatorHealth: (
        <div className="space-y-1 text-xs text-[var(--keeta-muted)]">
          <div>
            success {typeof anchor.operatorMetrics?.successRate === 'number' ? `${anchor.operatorMetrics.successRate.toFixed(1)}%` : '—'}
          </div>
          <div>
            p95 {typeof anchor.operatorMetrics?.p95LatencyMs === 'number' ? `${Math.round(anchor.operatorMetrics.p95LatencyMs)} ms` : '—'}
          </div>
          <div>
            unsettled {typeof anchor.operatorMetrics?.unsettledVolume === 'number' ? String(Math.round(anchor.operatorMetrics.unsettledVolume)) : '—'}
          </div>
          <div>
            bond {typeof anchor.operatorMetrics?.bondVerified === 'boolean' ? (anchor.operatorMetrics.bondVerified ? 'verified' : 'unverified') : '—'}
            {typeof anchor.operatorMetrics?.bondAgeDays === 'number'
              ? ` / ${anchor.operatorMetrics.bondAgeDays.toFixed(1)}d`
              : ''}
          </div>
        </div>
      ),
      volumeFee:
        typeof anchor.commercialTerms?.volumeFeeBps === 'number'
          ? `${anchor.commercialTerms.volumeFeeBps} bps`
          : '—',
      setup: anchor.commercialTerms?.setupFeeNote ?? '—',
      lockRef: href ? (
        <a className="font-mono text-xs text-[var(--keeta-accent-deep)] underline" href={href}>
          {anchor.currentBond?.lockTxHash}
        </a>
      ) : (
        <span className="font-mono text-xs">{anchor.currentBond?.lockTxHash ?? '—'}</span>
      ),
      updated: <span className="font-mono text-xs">{formatDateTime(anchor.updatedAt)}</span>,
    };
  });

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Anchor network"
        title="Payment anchors"
        description="Anchor identity, commercial terms, and KTA bond posture for operator-managed corridors."
        meta={<StatusPill tone="info">{formatNumber(anchors.length)} anchors</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Anchors" value={formatNumber(anchors.length)} hint="Registered records" />
        <Kpi
          label="Active"
          value={formatNumber(active)}
          hint="Operational anchors"
          trend="up"
        />
        <Kpi
          label="Bonded"
          value={formatNumber(bonded)}
          hint="Active KTA bond coverage"
          trend="up"
        />
        <Kpi
          label="Live ready"
          value={formatNumber(liveReady)}
          hint="Status and bond both ready"
          trend="up"
        />
      </KpiGrid>

      <Card kicker="Directory" title="All payment anchors" padding="sm">
        <div className="mb-4 rounded-2xl border border-[var(--keeta-line)] bg-white/70 p-4 text-sm text-[var(--keeta-muted)]">
          Anchor economics are modeled in three parts: a setup fee note for integration/commercial context, a locked
          KTA bond with a 30 or 90 day withdrawal delay, and a volume fee in basis points. This is operator
          configuration, not legal advice.
        </div>

        <DataTable
          columns={[
            { key: 'label', label: 'Anchor' },
            { key: 'corridor', label: 'Corridor' },
            { key: 'status', label: 'Anchor status' },
            { key: 'bond', label: 'Bond' },
            { key: 'delay', label: 'Delay' },
            { key: 'bondStatus', label: 'Bond status' },
            { key: 'readiness', label: 'Readiness' },
            { key: 'operatorHealth', label: 'Operator health' },
            { key: 'volumeFee', label: 'Volume fee' },
            { key: 'setup', label: 'Setup note' },
            { key: 'lockRef', label: 'Lock ref' },
            { key: 'updated', label: 'Updated' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No payment anchors registered yet."
        />
      </Card>
    </div>
  );
}
