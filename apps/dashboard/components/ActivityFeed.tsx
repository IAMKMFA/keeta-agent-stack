import { EmptyState, StatusPill } from './ui';
import { formatDateTime, shortId } from '../lib/format';
import type { DashboardEvent } from '../lib/dashboard-summary';

export function ActivityFeed({ events }: { events: DashboardEvent[] }) {
  if (events.length === 0) {
    return (
      <EmptyState
        title="No recent activity"
        description="Audit events will appear here as agents move through quote, route, policy, simulation, and execution."
      />
    );
  }

  return (
    <ol className="space-y-2">
      {events.map((event) => (
        <li
          key={event.id}
          className="rounded-xl border border-[var(--keeta-line)] bg-white/70 p-3"
        >
          <div className="flex flex-wrap items-center justify-between gap-2">
            <StatusPill tone="accent" dot={false}>
              {event.eventType}
            </StatusPill>
            <span className="font-mono text-[11px] text-[var(--keeta-muted)]">
              {formatDateTime(event.createdAt)}
            </span>
          </div>
          <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[var(--keeta-muted)]">
            <span className="font-mono">{shortId(event.id, 8)}</span>
            {event.intentId ? <span>Intent {shortId(event.intentId, 8)}</span> : null}
          </div>
        </li>
      ))}
    </ol>
  );
}
