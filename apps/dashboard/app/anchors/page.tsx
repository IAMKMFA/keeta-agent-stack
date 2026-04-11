import { DataTable } from '../../components/DataTable';
import { StatusCard } from '../../components/StatusCard';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber } from '../../lib/format';

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
        <span className="inline-flex rounded-full border border-[rgba(50,149,144,0.42)] bg-[rgba(50,149,144,0.12)] px-2 py-1 text-xs text-[#1d635f]">
          {anchor.status}
        </span>
      ),
      bond: anchor.currentBond ? `${anchor.currentBond.amountAtomic} ${anchor.currentBond.assetId}` : '—',
      delay: anchor.currentBond ? `${anchor.currentBond.delayDays}d` : '—',
      bondStatus: anchor.currentBond ? (
        <span className="inline-flex rounded-full border border-[var(--hub-line)] px-2 py-1 text-xs">
          {anchor.currentBond.status}
          {anchor.currentBond.verified ? ' / verified' : ''}
        </span>
      ) : (
        'missing'
      ),
      readiness: (
        <div className="space-y-1">
          <span className="inline-flex rounded-full border border-[var(--hub-line)] px-2 py-1 text-xs">
            {anchor.readiness.status}
          </span>
          <div className="max-w-[20rem] text-xs text-[var(--hub-muted)]">
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
        <div className="space-y-1 text-xs text-[var(--hub-muted)]">
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
        <a className="font-mono text-xs text-[var(--hub-accent-deep)] underline" href={href}>
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
      <div>
        <div className="hub-kicker">Anchor Network</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Payment Anchors</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Anchor identity, commercial terms, and KTA bond posture for operator-managed corridors.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-4">
        <StatusCard title="Anchors" value={formatNumber(anchors.length)} hint="Registered records" />
        <StatusCard title="Active" value={formatNumber(active)} hint="Operational anchors" tone="good" />
        <StatusCard title="Bonded" value={formatNumber(bonded)} hint="Active KTA bond coverage" tone="good" />
        <StatusCard title="Live Ready" value={formatNumber(liveReady)} hint="Status and bond both ready" tone="good" />
      </div>

      <section className="hub-soft-panel p-5">
        <div className="mb-4 rounded-2xl border border-[var(--hub-line)] bg-white/70 p-4 text-sm text-[var(--hub-muted)]">
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
      </section>
    </div>
  );
}
