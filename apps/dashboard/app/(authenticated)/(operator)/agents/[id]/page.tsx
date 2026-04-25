import Link from 'next/link';
import { notFound } from 'next/navigation';
import { requireScope } from '../../../../../lib/auth';
import { requireV2Enabled } from '../../../../../lib/flags';
import { fetchJson } from '../../../../../lib/api';
import type { AgentSummary } from '../../../../../lib/dashboard-summary';
import { Card, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../../components/ui';
import { formatDateTime, formatNumber } from '../../../../../lib/format';

interface AgentDetailResponse {
  agent: AgentSummary;
  intents: {
    totalRecent: number;
    byStatus: Record<string, number>;
  };
  executions: {
    totalRecent: number;
    byStatus: Record<string, number>;
  };
}

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Agent detail — Keeta Agent Hub' };

export default async function AgentDetailPage({ params }: { params: Promise<{ id: string }> }) {
  requireV2Enabled();
  await requireScope('ops:read');
  const { id } = await params;
  const data = await fetchJson<AgentDetailResponse | null>(`/ops/agents/${id}`, null);
  if (!data) notFound();

  const agent = data.agent;
  const intentStatuses = Object.entries(data.intents.byStatus);
  const executionStatuses = Object.entries(data.executions.byStatus);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Agent Studio · Detail"
        title={agent.name}
        description={agent.description ?? 'Strategy-backed autonomous execution agent.'}
        meta={
          <>
            <StatusPill tone={agent.paused ? 'warning' : 'success'}>
              {agent.paused ? 'Paused' : 'Running'}
            </StatusPill>
            <Link href="/agents" className="hub-pill px-3 py-1.5">
              Back to Studio
            </Link>
          </>
        }
      />

      <KpiGrid columns={4}>
        <Kpi label="Recent intents" value={formatNumber(data.intents.totalRecent)} />
        <Kpi label="Recent executions" value={formatNumber(data.executions.totalRecent)} />
        <Kpi label="Policy pack" value={agent.policyPackId ? 'linked' : 'none'} size="sm" />
        <Kpi label="Created" value={formatDateTime(agent.createdAt)} size="sm" />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-3">
        <Card kicker="Overview" title="Agent configuration" className="xl:col-span-2">
          <pre className="max-h-[480px] overflow-auto rounded-xl border border-[var(--keeta-line)] bg-[#111313] p-4 text-xs text-[#dbe4e4]">
            {JSON.stringify(agent.config, null, 2)}
          </pre>
        </Card>

        <div className="space-y-4">
          <Card kicker="Policy" title="Policy assignment">
            <p className="font-mono text-xs text-[var(--keeta-muted)]">
              {agent.policyPackId ?? 'No policy pack assigned'}
            </p>
          </Card>

          <Card kicker="Intent status" title="Recent breakdown">
            <div className="space-y-2 text-sm">
              {intentStatuses.length === 0 ? (
                <p className="text-[var(--keeta-muted)]">No recent intents.</p>
              ) : (
                intentStatuses.map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span>{status}</span>
                    <span className="font-mono">{formatNumber(count)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>

          <Card kicker="Execution status" title="Recent breakdown">
            <div className="space-y-2 text-sm">
              {executionStatuses.length === 0 ? (
                <p className="text-[var(--keeta-muted)]">No recent executions.</p>
              ) : (
                executionStatuses.map(([status, count]) => (
                  <div key={status} className="flex justify-between">
                    <span>{status}</span>
                    <span className="font-mono">{formatNumber(count)}</span>
                  </div>
                ))
              )}
            </div>
          </Card>
        </div>
      </div>
    </div>
  );
}
