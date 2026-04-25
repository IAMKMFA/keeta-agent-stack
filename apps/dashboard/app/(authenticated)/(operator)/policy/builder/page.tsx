import Link from 'next/link';
import { requireScope } from '../../../../../lib/auth';
import { requireV2Enabled } from '../../../../../lib/flags';
import { fetchJson } from '../../../../../lib/api';
import {
  Card,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHeader,
  StatusPill,
} from '../../../../../components/ui';
import { formatNumber } from '../../../../../lib/format';

interface PolicyRuleMetadata {
  ruleId: string;
  configKey?: string;
  description?: string;
}

interface PolicyPack {
  id: string;
  name: string;
  description?: string | null;
  rules?: Array<{ ruleId?: string; enabled?: boolean; configKey?: string; config?: unknown }>;
  compositions?: unknown[];
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Policy Builder — Keeta Agent Hub' };

export default async function PolicyBuilderPage() {
  requireV2Enabled();
  await requireScope('policy:read');

  const [rulesResponse, packsResponse] = await Promise.all([
    fetchJson<{ rules: PolicyRuleMetadata[] }>('/policy/rules', { rules: [] }),
    fetchJson<PolicyPack[] | { packs?: PolicyPack[] }>('/policy/packs', []),
  ]);
  const packs = Array.isArray(packsResponse)
    ? packsResponse
    : Array.isArray(packsResponse.packs)
      ? packsResponse.packs
      : [];
  const rules = rulesResponse.rules;
  const linkedRuleIds = new Set(
    packs.flatMap((pack) => pack.rules?.map((rule) => rule.ruleId).filter(Boolean) ?? [])
  );

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Policy Builder"
        title="Visual policy foundation"
        description="The builder starts with a typed, serializable model over existing policy packs and rules. Graph editing can be added once this shape is stable."
        meta={
          <>
            <StatusPill tone="accent">PolicyPack-compatible</StatusPill>
            <Link href="/policy" className="hub-pill px-3 py-1.5">
              Insights
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Built-in rules" value={formatNumber(rules.length)} />
        <Kpi label="Policy packs" value={formatNumber(packs.length)} />
        <Kpi label="Used rules" value={formatNumber(linkedRuleIds.size)} />
        <Kpi
          label="Graph readiness"
          value={rules.length > 0 ? 'ready' : 'waiting'}
          size="sm"
          hint="No React Flow dependency in Phase 1"
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-5">
        <Card
          className="xl:col-span-2"
          kicker="Rule palette"
          title="Available policy blocks"
          description="Each card maps to a real rule metadata entry exposed by the API."
        >
          {rules.length === 0 ? (
            <EmptyState
              title="No rule metadata"
              description="The policy engine did not return rule metadata."
            />
          ) : (
            <div className="space-y-2">
              {rules.map((rule) => (
                <div
                  key={rule.ruleId}
                  className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
                >
                  <div className="font-mono text-xs font-semibold text-[var(--keeta-ink)]">
                    {rule.ruleId}
                  </div>
                  <div className="mt-1 text-xs text-[var(--keeta-muted)]">
                    {rule.configKey ? `configKey: ${rule.configKey}` : 'No config key'}
                  </div>
                  {rule.description ? (
                    <p className="mt-2 text-sm text-[var(--keeta-ink-subtle)]">
                      {rule.description}
                    </p>
                  ) : null}
                </div>
              ))}
            </div>
          )}
        </Card>

        <Card
          className="xl:col-span-3"
          kicker="Packs"
          title="Serializable pack model"
          description="This is the exact storage-backed shape the future visual graph will read from and write to."
        >
          {packs.length === 0 ? (
            <EmptyState
              title="No policy packs"
              description="Create a policy pack through the API to start building."
            />
          ) : (
            <div className="space-y-4">
              {packs.map((pack) => (
                <div
                  key={pack.id}
                  className="rounded-2xl border border-[var(--keeta-line)] bg-white/70 p-4"
                >
                  <div className="flex flex-wrap items-center justify-between gap-2">
                    <div>
                      <div className="font-medium text-[var(--keeta-ink)]">{pack.name}</div>
                      {pack.description ? (
                        <div className="text-sm text-[var(--keeta-muted)]">{pack.description}</div>
                      ) : null}
                    </div>
                    <StatusPill tone="neutral" dot={false}>
                      {formatNumber(pack.rules?.length ?? 0)} rules
                    </StatusPill>
                  </div>
                  <pre className="mt-3 max-h-64 overflow-auto rounded-xl border border-[var(--keeta-line)] bg-[#111313] p-3 text-xs text-[#dbe4e4]">
                    {JSON.stringify(
                      { rules: pack.rules ?? [], compositions: pack.compositions ?? [] },
                      null,
                      2
                    )}
                  </pre>
                </div>
              ))}
            </div>
          )}
        </Card>
      </div>
    </div>
  );
}
