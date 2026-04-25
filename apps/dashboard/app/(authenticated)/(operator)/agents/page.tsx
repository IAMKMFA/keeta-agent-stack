import Link from 'next/link';
import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import type { AgentListResponse } from '../../../../lib/dashboard-summary';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatDateTime, formatNumber } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agent Studio — Keeta Agent Hub' };

const emptyAgents: AgentListResponse = { agents: [], templates: [] };

export default async function AgentsPage() {
  requireV2Enabled();
  await requireScope('ops:read');
  const data = await fetchJson<AgentListResponse>('/ops/agents', emptyAgents);
  const active = data.agents.filter((agent) => !agent.paused).length;
  const policyLinked = data.agents.filter((agent) => agent.policyPackId).length;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Agent Studio"
        title="Agent management"
        description="Strategies are the persisted agent model for this phase: inspect runtime posture, templates, policy links, and execution readiness without touching signing paths."
        meta={<StatusPill tone="accent">Read-first foundation</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Agents" value={formatNumber(data.agents.length)} hint="Persisted strategies" />
        <Kpi label="Active" value={formatNumber(active)} hint={`${formatNumber(data.agents.length - active)} paused`} />
        <Kpi label="Policy-linked" value={formatNumber(policyLinked)} hint="With policy pack assignment" />
        <Kpi label="Templates" value={formatNumber(data.templates.length)} hint="Seeded blueprints" />
      </KpiGrid>

      {data.agents.length === 0 ? (
        <Card>
          <EmptyState
            title="No agents yet"
            description="Seed strategies or create agent records through the API before using the Studio."
          />
        </Card>
      ) : (
        <div className="grid gap-4 lg:grid-cols-2">
          {data.agents.map((agent) => (
            <Card
              key={agent.id}
              kicker={agent.paused ? 'paused agent' : 'active agent'}
              title={agent.name}
              description={agent.description ?? agent.slug ?? 'Strategy-backed agent'}
              actions={
                <StatusPill tone={agent.paused ? 'warning' : 'success'} dot={false}>
                  {agent.paused ? 'paused' : 'running'}
                </StatusPill>
              }
            >
              <div className="space-y-3 text-sm">
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--keeta-muted)]">Policy pack</span>
                  <span className="font-mono text-xs">{agent.policyPackId ?? 'not assigned'}</span>
                </div>
                <div className="flex justify-between gap-3">
                  <span className="text-[var(--keeta-muted)]">Created</span>
                  <span className="font-mono text-xs">{formatDateTime(agent.createdAt)}</span>
                </div>
                <Link
                  href={`/agents/${agent.id}`}
                  className="inline-flex font-medium text-[var(--keeta-accent-deep)]"
                >
                  Open agent detail
                </Link>
              </div>
            </Card>
          ))}
        </div>
      )}

      <Card kicker="Templates" title="Template gallery bridge">
        <div className="grid gap-3 md:grid-cols-2 xl:grid-cols-3">
          {data.templates.slice(0, 6).map((template) => (
            <div key={template.id} className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3">
              <div className="font-medium text-[var(--keeta-ink)]">{template.name}</div>
              <div className="mt-1 text-xs text-[var(--keeta-muted)]">{template.description ?? template.slug}</div>
            </div>
          ))}
        </div>
      </Card>
    </div>
  );
}
