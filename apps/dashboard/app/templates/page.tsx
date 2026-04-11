import { fetchJson } from '../../lib/api';
import { StatusCard } from '../../components/StatusCard';
import { formatNumber } from '../../lib/format';

type TemplateRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  isTemplate: boolean;
  config: Record<string, unknown>;
};

export default async function Page() {
  const rows = await fetchJson<TemplateRow[]>('/strategy-templates', []);
  const withDescriptions = rows.filter((row) => Boolean(row.description)).length;
  const templateCount = rows.filter((row) => row.isTemplate).length;

  return (
    <div className="space-y-6">
      <div>
        <div className="hub-kicker">Strategy Catalog</div>
        <h1 className="hub-heading mt-1 text-3xl font-semibold">Strategy templates</h1>
        <p className="mt-2 text-sm text-[var(--hub-muted)]">
          Productized recipes mapped to example packages — use as starting points for agents.
        </p>
      </div>

      <div className="grid gap-4 md:grid-cols-3">
        <StatusCard title="Templates" value={formatNumber(templateCount)} hint="Seeded strategy blueprints" />
        <StatusCard title="Named entries" value={formatNumber(rows.length)} hint="Total rows in registry" />
        <StatusCard title="Documented" value={formatNumber(withDescriptions)} hint="With descriptions" />
      </div>

      <div className="grid gap-4 md:grid-cols-2">
        {rows.length === 0 ? (
          <p className="rounded-xl border border-[var(--hub-line)] bg-white px-4 py-3 text-sm text-[var(--hub-muted)]">
            No templates found. Run `pnpm db:seed` after migrations.
          </p>
        ) : (
          rows.map((t) => (
            <div key={t.id} className="hub-soft-panel space-y-3 p-4">
              <div className="hub-heading text-base font-semibold">{t.name}</div>
              {t.slug ? (
                <div className="font-mono text-xs text-[var(--hub-muted)]">{t.slug}</div>
              ) : null}
              {t.description ? <p className="text-sm text-[#575555]">{t.description}</p> : null}
              <pre className="overflow-x-auto rounded-xl border border-[var(--hub-line)] bg-[#111313] p-3 text-xs text-[#dbe4e4]">
                {JSON.stringify(t.config, null, 2)}
              </pre>
            </div>
          ))
        )}
      </div>
    </div>
  );
}
