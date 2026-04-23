import { Card, StatusPill } from '../ui';
import { formatDateTime, shortId } from '../../lib/format';

interface AdapterHealth {
  adapterId: string;
  ok: boolean;
  latencyMs?: number;
  checkedAt?: string;
}

interface ExecutionRow {
  id: string;
  intentId?: string;
  status: string;
  createdAt: string;
}

interface IncidentListProps {
  adapterHealth: AdapterHealth[];
  recentFailures: ExecutionRow[];
  chainOk: boolean;
}

export function IncidentList({ adapterHealth, recentFailures, chainOk }: IncidentListProps) {
  const degraded = adapterHealth.filter((h) => !h.ok);

  const incidents: Array<{
    kind: 'chain' | 'adapter' | 'execution';
    tone: 'danger' | 'warning';
    title: string;
    detail: string;
    timestamp?: string;
  }> = [];

  if (!chainOk) {
    incidents.push({
      kind: 'chain',
      tone: 'danger',
      title: 'Keeta chain health degraded',
      detail: 'The chain health probe is reporting a non-OK state.',
    });
  }
  for (const d of degraded) {
    incidents.push({
      kind: 'adapter',
      tone: 'warning',
      title: `Adapter ${d.adapterId} unhealthy`,
      detail:
        d.latencyMs != null
          ? `Last probe at ${d.latencyMs}ms`
          : 'Last health probe failed.',
      timestamp: d.checkedAt,
    });
  }
  for (const f of recentFailures) {
    incidents.push({
      kind: 'execution',
      tone: 'warning',
      title: `Execution ${shortId(f.id, 10)} ${f.status}`,
      detail: f.intentId ? `Intent ${shortId(f.intentId, 10)}` : 'No intent id',
      timestamp: f.createdAt,
    });
  }

  return (
    <Card kicker="Incidents" title="Live operations feed">
      {incidents.length === 0 ? (
        <div className="rounded-xl border border-dashed border-[var(--keeta-line)] bg-[rgba(255,255,255,0.4)] p-4 text-sm text-[var(--keeta-muted)]">
          No active incidents. Keeta chain, adapters, and recent executions all look healthy.
        </div>
      ) : (
        <ul className="space-y-2">
          {incidents.slice(0, 8).map((inc, idx) => (
            <li
              key={`${inc.kind}-${idx}`}
              className="flex items-start gap-3 rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
            >
              <StatusPill tone={inc.tone}>{inc.kind}</StatusPill>
              <div className="min-w-0 flex-1">
                <div className="text-sm font-medium text-[var(--keeta-ink)]">{inc.title}</div>
                <div className="text-xs text-[var(--keeta-muted)]">{inc.detail}</div>
              </div>
              {inc.timestamp ? (
                <div className="shrink-0 font-mono text-[11px] text-[var(--keeta-muted)]">
                  {formatDateTime(inc.timestamp)}
                </div>
              ) : null}
            </li>
          ))}
        </ul>
      )}
    </Card>
  );
}
