import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatDateTime, formatNumber, shortId } from '../../../../lib/format';

type SimulationRow = {
  id: string;
  intentId: string;
  routePlanId: string | null;
  status: string;
  scenario: {
    fidelityMode?: string;
    latencyMs?: number;
    volatility?: number;
  };
  createdAt: string;
};

const scenarioPresets = [
  {
    name: 'Standard',
    mode: 'standard',
    description: 'Fast pre-trade confidence using baseline latency and volatility assumptions.',
  },
  {
    name: 'Shadow',
    mode: 'shadow',
    description:
      'Compares the proposed run against live execution posture when API/worker snapshots are available.',
  },
  {
    name: 'Replay',
    mode: 'replay',
    description: 'Designed for historical intent replays once backtest windows are selected.',
  },
  {
    name: 'Stress Test',
    mode: 'stress',
    description: 'Models degraded liquidity, wider slippage, and elevated latency.',
  },
];

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Simulation Lab — Keeta Agent Hub' };

export default async function SimulationLabPage() {
  requireV2Enabled();
  await requireScope('ops:read');
  const rows = await fetchJson<SimulationRow[]>('/simulations', []);
  const completed = rows.filter((row) => row.status === 'completed').length;
  const failed = rows.filter((row) => row.status === 'failed').length;
  const pending = rows.filter((row) => row.status === 'pending').length;
  const fidelityModes = new Set(rows.map((row) => row.scenario?.fidelityMode ?? 'standard'));

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Simulation Lab"
        title="What-if execution playground"
        description="A safe API-backed lab for scenario presets, recent simulation runs, and the future typed intent builder."
        meta={
          <>
            <StatusPill tone="accent">API-backed runs</StatusPill>
            <Link href="/simulations" className="hub-pill px-3 py-1.5">
              Classic table
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Runs" value={formatNumber(rows.length)} hint="Recent simulation jobs" />
        <Kpi
          label="Completed"
          value={formatNumber(completed)}
          trend={failed === 0 ? 'up' : 'flat'}
        />
        <Kpi label="Pending" value={formatNumber(pending)} trend={pending === 0 ? 'up' : 'flat'} />
        <Kpi label="Fidelity modes" value={formatNumber(fidelityModes.size)} />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-4">
        {scenarioPresets.map((preset) => (
          <Card key={preset.mode} kicker="Preset" title={preset.name}>
            <p className="text-sm text-[var(--keeta-ink-subtle)]">{preset.description}</p>
            <pre className="mt-3 rounded-xl border border-[var(--keeta-line)] bg-[#111313] p-3 text-xs text-[#dbe4e4]">
              {JSON.stringify({ fidelityMode: preset.mode }, null, 2)}
            </pre>
          </Card>
        ))}
      </div>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card
          className="xl:col-span-2"
          kicker="Intent builder"
          title="Typed form foundation"
          description="The next interactive step posts a validated intent/route pair into /simulations/run."
        >
          <div className="space-y-3 text-sm text-[var(--keeta-ink-subtle)]">
            <div className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Select an existing intent and route plan, then choose a scenario preset.
            </div>
            <div className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Heavy simulation stays server-side through the existing queue contract.
            </div>
            <div className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              Shadow and replay modes show whether worker/API snapshots are available before
              claiming fidelity.
            </div>
          </div>
        </Card>

        <Card className="xl:col-span-3" kicker="Recent" title="Latest simulation runs">
          {rows.length === 0 ? (
            <EmptyState
              title="No simulation runs"
              description="Queue a run through /simulations/run to populate the lab."
            />
          ) : (
            <div className="space-y-2">
              {rows.slice(0, 8).map((row) => (
                <div
                  key={row.id}
                  className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div className="font-mono text-xs text-[var(--keeta-ink)]">
                      {shortId(row.id, 10)}
                    </div>
                    <StatusPill
                      tone={
                        row.status === 'completed'
                          ? 'success'
                          : row.status === 'failed'
                            ? 'danger'
                            : 'warning'
                      }
                      dot={false}
                    >
                      {row.status}
                    </StatusPill>
                  </div>
                  <div className="mt-2 grid gap-2 text-xs text-[var(--keeta-muted)] sm:grid-cols-3">
                    <span>Intent {shortId(row.intentId, 8)}</span>
                    <span>{row.scenario?.fidelityMode ?? 'standard'}</span>
                    <span>{formatDateTime(row.createdAt)}</span>
                  </div>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
