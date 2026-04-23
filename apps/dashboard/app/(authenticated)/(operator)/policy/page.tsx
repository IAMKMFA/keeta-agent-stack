import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import {
  Card,
  Kpi,
  KpiGrid,
  PageHeader,
  StatusPill,
  EmptyState,
  Button,
} from '../../../../components/ui';
import { formatDateTime, formatNumber, shortId } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Policy Insights — Keeta Agent Hub' };

interface PolicyDecision {
  id: string;
  intentId: string;
  outcome: string;
  ruleId?: string | null;
  ruleName?: string | null;
  reason?: string | null;
  policyPackId?: string | null;
  createdAt: string;
  contributions?: unknown[];
}

interface PolicyPack {
  id: string;
  name: string;
  description?: string | null;
  rules?: unknown[];
}

function topRules(decisions: PolicyDecision[]): Array<{ key: string; count: number }> {
  const counts = new Map<string, number>();
  for (const d of decisions) {
    if (d.outcome !== 'blocked' && d.outcome !== 'deny') continue;
    const key = d.ruleName ?? d.ruleId ?? 'unknown rule';
    counts.set(key, (counts.get(key) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([key, count]) => ({ key, count }))
    .sort((a, b) => b.count - a.count)
    .slice(0, 6);
}

export default async function PolicyInsightsPage() {
  requireV2Enabled();
  await requireScope('policy:read');

  const [decisions, packs] = await Promise.all([
    fetchJson<PolicyDecision[]>('/policy/decisions?limit=500', []),
    fetchJson<PolicyPack[] | { packs?: PolicyPack[] }>('/policy/packs', []).then((x) =>
      Array.isArray(x) ? x : Array.isArray(x?.packs) ? x.packs : []
    ),
  ]);

  const total = decisions.length;
  const blocked = decisions.filter((d) => d.outcome === 'blocked' || d.outcome === 'deny').length;
  const passed = decisions.filter((d) => d.outcome === 'allowed' || d.outcome === 'pass').length;
  const blockRate = total > 0 ? Math.round((blocked / total) * 1000) / 10 : 0;
  const passRate = total > 0 ? Math.round((passed / total) * 1000) / 10 : 0;
  const packCount = packs.length;

  const top = topRules(decisions);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Policy"
        title="Policy insights"
        description="Pass/block trends, most-frequent blocking rules, policy pack coverage, and a drill-down into recent decisions."
        meta={
          <>
            <StatusPill tone="accent">Read-only</StatusPill>
            <Link href="/policy/evaluate">
              <Button variant="secondary" size="sm">
                Open evaluator
              </Button>
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Decisions (recent)" value={formatNumber(total)} />
        <Kpi
          label="Pass rate"
          value={`${passRate}`}
          unit="%"
          hint={`${formatNumber(passed)} allowed`}
          trend={passRate >= 90 ? 'up' : passRate >= 75 ? 'flat' : 'down'}
        />
        <Kpi
          label="Block rate"
          value={`${blockRate}`}
          unit="%"
          hint={`${formatNumber(blocked)} blocked`}
          trend={blockRate < 5 ? 'up' : blockRate < 15 ? 'flat' : 'down'}
        />
        <Kpi label="Policy packs" value={formatNumber(packCount)} hint="In storage" />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-5">
        <div className="xl:col-span-2">
          <Card kicker="Blocking" title="Top blocking rules">
            {top.length === 0 ? (
              <EmptyState
                title="No blocks recorded"
                description="Every recent decision passed — there's nothing to drill into."
              />
            ) : (
              <ul className="space-y-2">
                {top.map((row) => (
                  <li
                    key={row.key}
                    className="flex items-center justify-between gap-3 rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
                  >
                    <div className="min-w-0">
                      <div className="text-sm font-medium text-[var(--keeta-ink)]">
                        {row.key}
                      </div>
                    </div>
                    <div className="flex items-center gap-2">
                      <span className="font-mono text-xs text-[var(--keeta-muted)]">
                        {formatNumber(row.count)}
                      </span>
                      <StatusPill tone="danger" dot={false}>
                        blocks
                      </StatusPill>
                    </div>
                  </li>
                ))}
              </ul>
            )}
          </Card>
        </div>

        <div className="xl:col-span-3">
          <Card kicker="Recent" title="Latest decisions">
            {decisions.length === 0 ? (
              <EmptyState
                title="No decisions yet"
                description="Policy decisions will appear once intents start flowing."
              />
            ) : (
              <div className="max-h-[420px] overflow-y-auto">
                <table className="hub-table">
                  <thead>
                    <tr>
                      <th className="px-2 py-2 text-left">Intent</th>
                      <th className="px-2 py-2 text-left">Rule</th>
                      <th className="px-2 py-2 text-left">Outcome</th>
                      <th className="px-2 py-2 text-left">When</th>
                    </tr>
                  </thead>
                  <tbody>
                    {decisions.slice(0, 50).map((d) => {
                      const tone =
                        d.outcome === 'allowed' || d.outcome === 'pass'
                          ? 'success'
                          : d.outcome === 'blocked' || d.outcome === 'deny'
                            ? 'danger'
                            : 'warning';
                      return (
                        <tr key={d.id} className="text-sm">
                          <td className="px-2 py-2 font-mono text-xs">
                            {shortId(d.intentId, 10)}
                          </td>
                          <td className="px-2 py-2">
                            <div className="text-xs text-[var(--keeta-ink)]">
                              {d.ruleName ?? d.ruleId ?? '—'}
                            </div>
                            {d.reason ? (
                              <div className="text-[11px] text-[var(--keeta-muted)]">
                                {d.reason}
                              </div>
                            ) : null}
                          </td>
                          <td className="px-2 py-2">
                            <StatusPill tone={tone} dot={false}>
                              {d.outcome}
                            </StatusPill>
                          </td>
                          <td className="px-2 py-2 font-mono text-[11px] text-[var(--keeta-muted)]">
                            {formatDateTime(d.createdAt)}
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </Card>
        </div>
      </div>
    </div>
  );
}
