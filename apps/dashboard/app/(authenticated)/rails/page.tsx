import { requireScope } from '../../../lib/auth';
import { requireV2Enabled } from '../../../lib/flags';
import { fetchJson } from '../../../lib/api';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../components/ui';
import { formatNumber } from '../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Rail catalog — Keeta Agent Hub' };

type RailEntry = {
  id: string;
  name: string;
  kind: string;
  transport: 'fiat-push' | 'fiat-pull' | 'crypto' | 'native';
  production: boolean;
  description?: string;
  supportsManagedTransfer?: boolean;
};

const transportTone: Record<RailEntry['transport'], 'accent' | 'info' | 'warning' | 'success'> = {
  native: 'accent',
  crypto: 'info',
  'fiat-push': 'warning',
  'fiat-pull': 'success',
};

const transportLabel: Record<RailEntry['transport'], string> = {
  native: 'Keeta native',
  crypto: 'Crypto',
  'fiat-push': 'Fiat push',
  'fiat-pull': 'Fiat pull',
};

export default async function RailsPage({
  searchParams,
}: {
  searchParams: Promise<{ transport?: string; production?: string }>;
}) {
  requireV2Enabled();
  await requireScope('rails:read');
  const params = await searchParams;

  const qs = new URLSearchParams();
  if (params.transport) qs.set('transports', params.transport);
  if (params.production === 'true') qs.set('productionOnly', 'true');

  const data = await fetchJson<{ rails: RailEntry[] }>(
    `/rails/catalog${qs.toString() ? `?${qs}` : ''}`,
    { rails: [] }
  );
  const rails = data.rails ?? [];

  const byTransport = new Map<string, number>();
  for (const r of rails) {
    byTransport.set(r.transport, (byTransport.get(r.transport) ?? 0) + 1);
  }

  const production = rails.filter((r) => r.production).length;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Reference · Shared catalog"
        title="Rail catalog"
        description="Every rail supported by the Keeta network — fiat-push, fiat-pull, crypto, and native. Read-only for tenant and exec viewers."
        meta={
          <>
            <StatusPill tone="info">{formatNumber(rails.length)} rails</StatusPill>
            <StatusPill tone="success">{formatNumber(production)} production</StatusPill>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Keeta native" value={formatNumber(byTransport.get('native') ?? 0)} />
        <Kpi label="Crypto" value={formatNumber(byTransport.get('crypto') ?? 0)} />
        <Kpi label="Fiat push" value={formatNumber(byTransport.get('fiat-push') ?? 0)} />
        <Kpi label="Fiat pull" value={formatNumber(byTransport.get('fiat-pull') ?? 0)} />
      </KpiGrid>

      <form className="flex flex-wrap items-center gap-2" method="get">
        <label className="flex items-center gap-2 text-xs text-[var(--keeta-muted)]">
          <span>Transport</span>
          <select
            name="transport"
            defaultValue={params.transport ?? ''}
            className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-sm"
          >
            <option value="">All</option>
            <option value="native">Keeta native</option>
            <option value="crypto">Crypto</option>
            <option value="fiat-push">Fiat push</option>
            <option value="fiat-pull">Fiat pull</option>
          </select>
        </label>
        <label className="flex items-center gap-2 text-xs text-[var(--keeta-muted)]">
          <input
            type="checkbox"
            name="production"
            value="true"
            defaultChecked={params.production === 'true'}
          />
          Production only
        </label>
        <button
          type="submit"
          className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-xs hover:bg-[rgba(50,149,144,0.06)]"
        >
          Apply
        </button>
      </form>

      <Card kicker="Rails" title="Supported rails">
        {rails.length === 0 ? (
          <EmptyState
            title="No rails match"
            description="Try a different transport filter or clear the production-only toggle."
          />
        ) : (
          <div className="overflow-x-auto">
            <table className="hub-table">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">Name</th>
                  <th className="px-2 py-2 text-left">Transport</th>
                  <th className="px-2 py-2 text-left">Kind</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Description</th>
                </tr>
              </thead>
              <tbody>
                {rails.map((r) => (
                  <tr key={r.id} className="text-sm">
                    <td className="px-2 py-3">
                      <div className="font-medium text-[var(--keeta-ink)]">{r.name}</div>
                      <div className="font-mono text-[11px] text-[var(--keeta-muted)]">{r.id}</div>
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill tone={transportTone[r.transport]} dot={false}>
                        {transportLabel[r.transport]}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-3 text-xs text-[var(--keeta-ink-subtle)]">{r.kind}</td>
                    <td className="px-2 py-3">
                      <StatusPill tone={r.production ? 'success' : 'warning'} dot={false}>
                        {r.production ? 'Production' : 'Preview'}
                      </StatusPill>
                    </td>
                    <td className="px-2 py-3 text-xs text-[var(--keeta-muted)]">
                      {r.description ?? '—'}
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
