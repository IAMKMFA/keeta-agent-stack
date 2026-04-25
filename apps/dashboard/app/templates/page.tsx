import { fetchJson } from '../../lib/api';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../components/ui';
import { formatNumber } from '../../lib/format';

type TemplateRow = {
  id: string;
  name: string;
  slug: string | null;
  description: string | null;
  isTemplate: boolean;
  config: Record<string, unknown>;
};

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Strategy templates — Keeta Agent Hub' };

export default async function Page() {
  const rows = await fetchJson<TemplateRow[]>('/strategy-templates', []);
  const withDescriptions = rows.filter((row) => Boolean(row.description)).length;
  const templateCount = rows.filter((row) => row.isTemplate).length;

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Strategy catalog"
        title="Strategy templates"
        description="Productized recipes mapped to example packages — use as starting points for agents."
        meta={<StatusPill tone="info">{formatNumber(rows.length)} entries</StatusPill>}
      />

      <KpiGrid columns={3}>
        <Kpi
          label="Templates"
          value={formatNumber(templateCount)}
          hint="Seeded strategy blueprints"
        />
        <Kpi
          label="Named entries"
          value={formatNumber(rows.length)}
          hint="Total rows in registry"
        />
        <Kpi label="Documented" value={formatNumber(withDescriptions)} hint="With descriptions" />
      </KpiGrid>

      {rows.length === 0 ? (
        <Card>
          <EmptyState
            title="No templates found"
            description="Run pnpm db:seed after migrations to populate the registry."
          />
        </Card>
      ) : (
        <div className="grid gap-4 md:grid-cols-2">
          {rows.map((t) => (
            <Card
              key={t.id}
              kicker={t.isTemplate ? 'template' : 'entry'}
              title={t.name}
              description={t.slug ?? undefined}
            >
              {t.description ? (
                <p className="mb-3 text-sm text-[var(--keeta-ink-subtle)]">{t.description}</p>
              ) : null}
              <pre className="max-h-80 overflow-auto rounded-xl border border-[var(--keeta-line)] bg-[#111313] p-3 text-xs text-[#dbe4e4]">
                {JSON.stringify(t.config, null, 2)}
              </pre>
            </Card>
          ))}
        </div>
      )}
    </div>
  );
}
