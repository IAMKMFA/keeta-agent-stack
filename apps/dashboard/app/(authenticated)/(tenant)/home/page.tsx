import Link from 'next/link';
import { requireRole } from '../../../../lib/auth';
import { fetchJson } from '../../../../lib/api';
import {
  Button,
  Card,
  EmptyState,
  Kpi,
  KpiGrid,
  PageHeader,
  StatusPill,
} from '../../../../components/ui';
import { formatDateTime, formatNumber, shortId } from '../../../../lib/format';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Home — Keeta Agent Hub' };

type WalletRow = { id: string; label?: string; tenantId?: string };
type IntentRow = {
  id: string;
  status: string;
  approvalStatus: string;
  createdAt: string;
  tenantId?: string;
};
type WebhookDelivery = {
  id: string;
  status: string;
  attemptedAt?: string;
  tenantId?: string;
};

function scopeByTenant<T extends { tenantId?: string }>(rows: T[], tenantId: string): T[] {
  return rows.filter((r) => !r.tenantId || r.tenantId === tenantId);
}

export default async function TenantHomePage() {
  const viewer = await requireRole(['tenant', 'admin', 'operator']);
  const tenantId = viewer.tenantId ?? 'shared';

  const qs = viewer.tenantId ? `?tenantId=${encodeURIComponent(viewer.tenantId)}` : '';

  const [wallets, intents, deliveries] = await Promise.all([
    fetchJson<WalletRow[]>(`/wallets${qs}`, []),
    fetchJson<IntentRow[]>(`/intents${qs}`, []),
    fetchJson<WebhookDelivery[]>(`/ops/webhook-deliveries${qs}`, []),
  ]);

  const tenantWallets = viewer.tenantId ? scopeByTenant(wallets, viewer.tenantId) : wallets;
  const tenantIntents = viewer.tenantId ? scopeByTenant(intents, viewer.tenantId) : intents;
  const tenantDeliveries = viewer.tenantId
    ? scopeByTenant(deliveries, viewer.tenantId)
    : deliveries;

  const activeIntents = tenantIntents.filter(
    (i) => !['failed', 'settled', 'completed', 'cancelled'].includes(i.status)
  ).length;
  const recentDeliveries = tenantDeliveries.slice(0, 6);
  const deliverySuccess = tenantDeliveries.filter((d) => d.status === 'delivered').length;

  return (
    <div className="space-y-8">
      <PageHeader
        kicker={`Workspace · ${tenantId}`}
        title={`Welcome${viewer.displayName ? `, ${viewer.displayName}` : ''}`}
        description="Your wallets, recent intents, webhook health, and shared rail catalog — scoped to your tenant."
        meta={<StatusPill tone="info">Tenant workspace</StatusPill>}
      />

      <KpiGrid columns={4}>
        <Kpi label="Wallets" value={formatNumber(tenantWallets.length)} />
        <Kpi
          label="Active intents"
          value={formatNumber(activeIntents)}
          hint={`${formatNumber(tenantIntents.length)} total`}
        />
        <Kpi
          label="Webhook deliveries"
          value={formatNumber(tenantDeliveries.length)}
          hint={`${formatNumber(deliverySuccess)} delivered`}
        />
        <Kpi
          label="Latest activity"
          value={tenantIntents[0] ? formatDateTime(tenantIntents[0].createdAt) : '—'}
          hint={tenantIntents[0]?.status ?? 'No intents yet'}
          size="sm"
        />
      </KpiGrid>

      <div className="grid gap-4 xl:grid-cols-2">
        <Card
          kicker="Intents"
          title="Recent intents"
          actions={
            <Link href="/my-intents">
              <Button variant="secondary" size="sm">
                View all
              </Button>
            </Link>
          }
        >
          {tenantIntents.length === 0 ? (
            <EmptyState
              title="No intents yet"
              description="When your team kicks off an intent, it will appear here."
            />
          ) : (
            <ul className="divide-y divide-[var(--keeta-line)]">
              {tenantIntents.slice(0, 6).map((intent) => (
                <li
                  key={intent.id}
                  className="flex items-center justify-between py-3 text-sm first:pt-0"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-[var(--keeta-ink)]">
                      {shortId(intent.id, 12)}
                    </div>
                    <div className="text-[11px] text-[var(--keeta-muted)]">
                      {formatDateTime(intent.createdAt)}
                    </div>
                  </div>
                  <StatusPill
                    tone={
                      intent.status === 'settled' || intent.status === 'completed'
                        ? 'success'
                        : intent.status === 'failed'
                          ? 'danger'
                          : intent.status === 'held'
                            ? 'warning'
                            : 'neutral'
                    }
                  >
                    {intent.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>

        <Card
          kicker="Webhooks"
          title="Webhook deliveries"
          actions={
            <Link href="/my-webhooks">
              <Button variant="secondary" size="sm">
                View all
              </Button>
            </Link>
          }
        >
          {recentDeliveries.length === 0 ? (
            <EmptyState
              title="No webhook activity"
              description="Subscribe to webhook events to see delivery health here."
            />
          ) : (
            <ul className="divide-y divide-[var(--keeta-line)]">
              {recentDeliveries.map((d) => (
                <li
                  key={d.id}
                  className="flex items-center justify-between py-3 text-sm first:pt-0"
                >
                  <div className="min-w-0">
                    <div className="font-mono text-xs text-[var(--keeta-ink)]">
                      {shortId(d.id, 12)}
                    </div>
                    <div className="text-[11px] text-[var(--keeta-muted)]">
                      {d.attemptedAt ? formatDateTime(d.attemptedAt) : '—'}
                    </div>
                  </div>
                  <StatusPill tone={d.status === 'delivered' ? 'success' : 'warning'}>
                    {d.status}
                  </StatusPill>
                </li>
              ))}
            </ul>
          )}
        </Card>
      </div>

      <Card kicker="Reference" title="Explore the rail catalog">
        <div className="flex flex-wrap items-center justify-between gap-3">
          <p className="max-w-xl text-sm text-[var(--keeta-muted)]">
            Browse supported fiat-push, fiat-pull, and crypto rails available across the Keeta
            network. Rails are shared and read-only from your workspace.
          </p>
          <Link href="/rails">
            <Button variant="primary">Open rail catalog</Button>
          </Link>
        </div>
      </Card>
    </div>
  );
}
