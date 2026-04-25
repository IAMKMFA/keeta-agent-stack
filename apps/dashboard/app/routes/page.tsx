import { DataTable } from '../../components/DataTable';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { fetchJson } from '../../lib/api';
import { formatDateTime, formatNumber, formatOptionalNumber, shortId } from '../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Routes — Keeta Agent Hub' };

type RoutePayload = {
  hopCount?: number;
  totalFeeBps?: number;
  expectedSlippageBps?: number;
  steps?: Array<{
    adapterId?: string;
    paymentAnchorId?: string;
    routingContext?: {
      corridorMatch?: 'exact' | 'listed' | 'unscoped';
      scoreAdjustment?: number;
      operatorSuccessRate?: number;
      operatorP95LatencyMs?: number;
    };
  }>;
};

type RouteRow = {
  id: string;
  intentId: string;
  score: number;
  payload?: RoutePayload;
  createdAt: string;
};

function averageScore(rows: RouteRow[]): string {
  if (rows.length === 0) return '—';
  const avg = rows.reduce((sum, row) => sum + row.score, 0) / rows.length;
  return avg.toFixed(4);
}

export default async function Page() {
  const rows = await fetchJson<RouteRow[]>('/routes', []);
  const highConfidence = rows.filter((row) => row.score > 0).length;
  const avgScore = averageScore(rows);

  const tableRows = rows.map((row) => ({
    _key: row.id,
    id: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{shortId(row.id)}</div>
        <div className="font-mono text-[11px] text-[var(--keeta-muted)]">{row.id}</div>
      </div>
    ),
    intent: <span className="font-mono text-xs">{shortId(row.intentId)}</span>,
    venue: (
      <div className="space-y-0.5">
        <div className="font-mono text-xs">{row.payload?.steps?.[0]?.adapterId ?? '—'}</div>
        <div className="text-[11px] text-[var(--keeta-muted)]">
          {row.payload?.steps?.[0]?.routingContext?.corridorMatch ?? '—'}
          {typeof row.payload?.steps?.[0]?.routingContext?.scoreAdjustment === 'number'
            ? ` / ${row.payload.steps[0].routingContext.scoreAdjustment >= 0 ? '+' : ''}${row.payload.steps[0].routingContext.scoreAdjustment.toFixed(1)}`
            : ''}
        </div>
        <div className="text-[11px] text-[var(--keeta-muted)]">
          {typeof row.payload?.steps?.[0]?.routingContext?.operatorSuccessRate === 'number'
            ? `${row.payload.steps[0].routingContext.operatorSuccessRate.toFixed(1)}%`
            : '—'}
          {typeof row.payload?.steps?.[0]?.routingContext?.operatorP95LatencyMs === 'number'
            ? ` / ${Math.round(row.payload.steps[0].routingContext.operatorP95LatencyMs)} ms`
            : ''}
        </div>
      </div>
    ),
    hops: formatOptionalNumber(row.payload?.hopCount),
    feeBps: formatOptionalNumber(row.payload?.totalFeeBps, 1),
    slippage: formatOptionalNumber(row.payload?.expectedSlippageBps, 1),
    score: <span className="font-mono">{row.score.toFixed(4)}</span>,
    created: <span className="font-mono text-xs">{formatDateTime(row.createdAt)}</span>,
  }));

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Routing intelligence"
        title="Routes"
        description="Candidate route plans produced by the router with hop count, fee, slippage, and composite score."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} plans</StatusPill>}
      />

      <KpiGrid columns={3}>
        <Kpi label="Route plans" value={formatNumber(rows.length)} hint="Latest first" />
        <Kpi
          label="Positive score"
          value={formatNumber(highConfidence)}
          hint="Score greater than 0"
        />
        <Kpi label="Average score" value={avgScore} hint="Across visible plans" />
      </KpiGrid>

      <Card kicker="Candidates" title="Recent route plans" padding="sm">
        <DataTable
          columns={[
            { key: 'id', label: 'Route ID' },
            { key: 'intent', label: 'Intent' },
            { key: 'venue', label: 'Venue' },
            { key: 'hops', label: 'Hops' },
            { key: 'feeBps', label: 'Fee (bps)' },
            { key: 'slippage', label: 'Slippage (bps)' },
            { key: 'score', label: 'Score' },
            { key: 'created', label: 'Created' },
          ]}
          rows={tableRows}
          rowKey={(row) => String(row._key)}
          emptyMessage="No route plans yet. Run route generation for an intent to see output here."
        />
      </Card>
    </div>
  );
}
