import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { fetchJson } from '../../../../lib/api';
import { Card, EmptyState, Kpi, KpiGrid, PageHeader, StatusPill } from '../../../../components/ui';
import { formatDateTime, formatNumber, shortId } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Webhook deliveries — Keeta Agent Hub' };

interface WebhookSubscription {
  id: string;
  url: string;
  secret?: string;
  disabled?: boolean;
  events?: string[];
  tenantId?: string;
}

interface WebhookDelivery {
  id: string;
  subscriptionId: string;
  eventId?: string;
  eventSource?: string;
  status: string;
  attemptCount: number;
  responseStatus?: number;
  responseBody?: string;
  lastError?: string;
  deliveredAt?: string;
  nextAttemptAt?: string;
  createdAt: string;
  updatedAt: string;
}

function redactUrl(url: string): string {
  try {
    const u = new URL(url);
    return `${u.protocol}//${u.host}${u.pathname.length > 1 ? u.pathname : ''}`;
  } catch {
    return url;
  }
}

function latencyMs(d: WebhookDelivery): number | null {
  if (!d.deliveredAt || !d.createdAt) return null;
  return Date.parse(d.deliveredAt) - Date.parse(d.createdAt);
}

export default async function WebhooksPage() {
  requireV2Enabled();
  await requireScope('webhooks:read');

  const [subs, deliveries] = await Promise.all([
    fetchJson<{ webhooks: WebhookSubscription[] } | WebhookSubscription[]>('/ops/webhooks', {
      webhooks: [],
    }).then((x) => (Array.isArray(x) ? x : (x.webhooks ?? []))),
    fetchJson<{ deliveries: WebhookDelivery[] } | WebhookDelivery[]>(
      '/ops/webhook-deliveries?limit=200',
      { deliveries: [] }
    ).then((x) => (Array.isArray(x) ? x : (x.deliveries ?? []))),
  ]);

  const total = deliveries.length;
  const delivered = deliveries.filter((d) => d.status === 'delivered').length;
  const failed = deliveries.filter(
    (d) => d.status === 'failed' || d.status === 'dead_letter'
  ).length;
  const pending = deliveries.filter(
    (d) => d.status === 'pending' || d.status === 'queued' || d.status === 'retrying'
  ).length;
  const successRate = total > 0 ? Math.round((delivered / total) * 1000) / 10 : 0;
  const latencies = deliveries
    .map((d) => latencyMs(d))
    .filter((n): n is number => n !== null && Number.isFinite(n) && n >= 0);
  const median =
    latencies.length > 0
      ? (() => {
          const sorted = [...latencies].sort((a, b) => a - b);
          const mid = Math.floor(sorted.length / 2);
          return sorted.length % 2 === 0 ? (sorted[mid - 1]! + sorted[mid]!) / 2 : sorted[mid]!;
        })()
      : null;

  const subMap = new Map<string, WebhookSubscription>();
  for (const s of subs) subMap.set(s.id, s);

  return (
    <div className="space-y-8">
      <PageHeader
        kicker="Operator · Webhooks"
        title="Webhook deliveries"
        description="Delivery status, retry health, and latency across your configured webhook subscriptions. Response bodies are redacted to avoid leaking sensitive payloads."
        meta={<StatusPill tone="accent">Read-only · redacted</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Subscriptions" value={formatNumber(subs.length)} />
        <Kpi
          label="Deliveries (recent)"
          value={formatNumber(total)}
          hint={`${formatNumber(delivered)} delivered`}
        />
        <Kpi
          label="Success rate"
          value={`${successRate}`}
          unit="%"
          hint={`${formatNumber(failed)} failed · ${formatNumber(pending)} pending`}
          trend={successRate >= 98 ? 'up' : successRate >= 90 ? 'flat' : 'down'}
        />
        <Kpi
          label="Median latency"
          value={median != null ? median.toFixed(0) : '—'}
          unit={median != null ? 'ms' : undefined}
          hint={`${formatNumber(latencies.length)} measured`}
        />
      </KpiGrid>

      <Card kicker="Subscriptions" title="Registered webhooks">
        {subs.length === 0 ? (
          <EmptyState title="No webhook subscriptions" />
        ) : (
          <div className="overflow-x-auto">
            <table className="hub-table">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">Endpoint</th>
                  <th className="px-2 py-2 text-left">Events</th>
                  <th className="px-2 py-2 text-left">Tenant</th>
                  <th className="px-2 py-2 text-left">Status</th>
                </tr>
              </thead>
              <tbody>
                {subs.map((s) => (
                  <tr key={s.id} className="text-sm">
                    <td className="px-2 py-3">
                      <div className="font-mono text-xs text-[var(--keeta-ink)]">
                        {redactUrl(s.url)}
                      </div>
                      <div className="font-mono text-[11px] text-[var(--keeta-muted)]">
                        {shortId(s.id, 10)}
                      </div>
                    </td>
                    <td className="px-2 py-3 text-xs text-[var(--keeta-ink-subtle)]">
                      {Array.isArray(s.events) && s.events.length > 0
                        ? s.events.slice(0, 3).join(', ') +
                          (s.events.length > 3 ? ` +${s.events.length - 3}` : '')
                        : 'all'}
                    </td>
                    <td className="px-2 py-3 font-mono text-[11px] text-[var(--keeta-muted)]">
                      {s.tenantId ?? '—'}
                    </td>
                    <td className="px-2 py-3">
                      <StatusPill tone={s.disabled ? 'warning' : 'success'} dot={false}>
                        {s.disabled ? 'Disabled' : 'Active'}
                      </StatusPill>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </Card>

      <Card kicker="Deliveries" title="Recent delivery attempts">
        {deliveries.length === 0 ? (
          <EmptyState title="No recent deliveries" />
        ) : (
          <div className="max-h-[560px] overflow-auto">
            <table className="hub-table">
              <thead>
                <tr>
                  <th className="px-2 py-2 text-left">When</th>
                  <th className="px-2 py-2 text-left">Subscription</th>
                  <th className="px-2 py-2 text-left">Status</th>
                  <th className="px-2 py-2 text-left">Attempts</th>
                  <th className="px-2 py-2 text-left">HTTP</th>
                  <th className="px-2 py-2 text-left">Last error</th>
                </tr>
              </thead>
              <tbody>
                {deliveries.slice(0, 100).map((d) => {
                  const sub = subMap.get(d.subscriptionId);
                  const tone =
                    d.status === 'delivered'
                      ? 'success'
                      : d.status === 'failed' || d.status === 'dead_letter'
                        ? 'danger'
                        : 'warning';
                  return (
                    <tr key={d.id} className="text-sm">
                      <td className="px-2 py-2 font-mono text-[11px] text-[var(--keeta-muted)]">
                        {formatDateTime(d.createdAt)}
                      </td>
                      <td className="px-2 py-2">
                        <div className="font-mono text-xs text-[var(--keeta-ink)]">
                          {sub ? redactUrl(sub.url) : shortId(d.subscriptionId, 10)}
                        </div>
                      </td>
                      <td className="px-2 py-2">
                        <StatusPill tone={tone} dot={false}>
                          {d.status}
                        </StatusPill>
                      </td>
                      <td className="px-2 py-2 font-mono text-xs">{d.attemptCount}</td>
                      <td className="px-2 py-2 font-mono text-xs">{d.responseStatus ?? '—'}</td>
                      <td className="px-2 py-2 text-xs text-[var(--keeta-muted)]">
                        {d.lastError ? d.lastError.slice(0, 120) : '—'}
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
  );
}
