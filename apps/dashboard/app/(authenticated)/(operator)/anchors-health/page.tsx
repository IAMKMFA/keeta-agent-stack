import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import {
  Button,
  Card,
  Kpi,
  KpiGrid,
  PageHeader,
  StatusPill,
  EmptyState,
} from '../../../../components/ui';
import { formatNumber, shortId } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Anchor & bond health — Keeta Agent Hub' };

interface AnchorHealthItem {
  id: string;
  label: string;
  adapterId: string;
  status: string;
  corridorKey?: string | null;
  ready: boolean;
  readinessStatus: 'ready' | 'needs_attention' | 'blocked';
  canServeLiveTraffic: boolean;
  bond: null | {
    amountAtomic: string;
    assetId: string;
    status: string;
    delayDays: number;
    verified: boolean | null;
    withdrawalRequestedAt?: string | null;
    ageDays: number | null;
  };
  operatorMetrics: null | {
    successRate?: number;
    p50LatencyMs?: number;
    p95LatencyMs?: number;
    bondAgeDays?: number;
  };
}

interface AnchorHealthResponse {
  summary: {
    total: number;
    bonded: number;
    verified: number;
    withdrawalRequested: number;
    notReady: number;
    statusCounts: Record<string, number>;
    bondCoverage: number;
    verificationRate: number;
    strictVerification: boolean;
  };
  anchors: AnchorHealthItem[];
}

function readinessTone(
  status: 'ready' | 'needs_attention' | 'blocked'
): 'success' | 'warning' | 'danger' {
  return status === 'ready' ? 'success' : status === 'needs_attention' ? 'warning' : 'danger';
}

export default async function AnchorsHealthPage() {
  requireV2Enabled();
  await requireScope('ops:read');

  const data = await fetchJson<AnchorHealthResponse>('/anchors/health', {
    summary: {
      total: 0,
      bonded: 0,
      verified: 0,
      withdrawalRequested: 0,
      notReady: 0,
      statusCounts: {},
      bondCoverage: 0,
      verificationRate: 0,
      strictVerification: false,
    },
    anchors: [],
  });

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Anchors"
        title="Anchor & bond health"
        description="Coverage, verification, withdrawal activity, and readiness across all registered payment anchors."
        meta={
          <>
            <StatusPill tone={data.summary.strictVerification ? 'success' : 'warning'}>
              {data.summary.strictVerification ? 'Strict verification' : 'Soft verification'}
            </StatusPill>
            <Link href="/anchors">
              <Button variant="secondary" size="sm">
                Full anchor list
              </Button>
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Total anchors" value={formatNumber(data.summary.total)} />
        <Kpi
          label="Bond coverage"
          value={`${data.summary.bondCoverage}`}
          unit="%"
          hint={`${formatNumber(data.summary.bonded)} bonded`}
          trend={
            data.summary.bondCoverage >= 80
              ? 'up'
              : data.summary.bondCoverage >= 50
                ? 'flat'
                : 'down'
          }
        />
        <Kpi
          label="Verification rate"
          value={`${data.summary.verificationRate}`}
          unit="%"
          hint={`${formatNumber(data.summary.verified)} of ${formatNumber(data.summary.bonded)}`}
          trend={data.summary.verificationRate >= 90 ? 'up' : 'flat'}
        />
        <Kpi
          label="Not ready"
          value={formatNumber(data.summary.notReady)}
          hint={`${formatNumber(data.summary.withdrawalRequested)} withdrawing`}
          trend={data.summary.notReady === 0 ? 'up' : 'down'}
        />
      </KpiGrid>

      <Card kicker="By readiness" title="All anchors">
        {data.anchors.length === 0 ? (
          <EmptyState title="No anchors registered" />
        ) : (
          <div className="overflow-x-auto">
            <table className="hub-table">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">Anchor</th>
                  <th className="px-2 py-2 text-left">Adapter</th>
                  <th className="px-2 py-2 text-left">Readiness</th>
                  <th className="px-2 py-2 text-left">Bond</th>
                  <th className="px-2 py-2 text-left">Verified</th>
                  <th className="px-2 py-2 text-left">Latency p95</th>
                </tr>
              </thead>
              <tbody>
                {data.anchors.map((a) => (
                  <tr key={a.id} className="text-sm">
                    <td className="px-2 py-3">
                      <div className="font-medium text-[var(--keeta-ink)]">{a.label}</div>
                      <div className="font-mono text-[11px] text-[var(--keeta-muted)]">
                        {shortId(a.id, 12)}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs">{a.adapterId}</td>
                    <td className="px-2 py-3">
                      <StatusPill tone={readinessTone(a.readinessStatus)} dot={false}>
                        {a.readinessStatus.replace('_', ' ')}
                      </StatusPill>
                      <div className="mt-1 text-[11px] text-[var(--keeta-muted)]">
                        {a.canServeLiveTraffic ? 'live-safe' : 'sim-only'}
                      </div>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs text-[var(--keeta-ink-subtle)]">
                      {a.bond ? (
                        <>
                          {a.bond.amountAtomic} {a.bond.assetId}
                          <div className="text-[11px] text-[var(--keeta-muted)]">
                            {a.bond.status} · {a.bond.delayDays}d delay
                          </div>
                        </>
                      ) : (
                        <span className="text-[var(--keeta-danger)]">no bond</span>
                      )}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill
                        tone={
                          a.bond?.verified === true ? 'success' : a.bond ? 'warning' : 'neutral'
                        }
                        dot={false}
                      >
                        {a.bond?.verified === true ? 'verified' : a.bond ? 'unverified' : '—'}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-3 font-mono text-xs text-[var(--keeta-muted)]">
                      {a.operatorMetrics?.p95LatencyMs != null
                        ? `${a.operatorMetrics.p95LatencyMs} ms`
                        : '—'}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>
    </div>
  );
}
