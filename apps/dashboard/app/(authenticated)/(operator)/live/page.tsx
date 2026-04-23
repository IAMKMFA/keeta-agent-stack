import { requireScope } from '../../../../lib/auth';
import { requireV2Enabled } from '../../../../lib/flags';
import { Card, PageHeader, StatusPill } from '../../../../components/ui';
import { LiveExecutionStream } from '../../../../components/LiveExecutionStream';

export const dynamic = 'force-dynamic';
export const metadata = { title: 'Live execution — Keeta Agent Hub' };

export default async function LivePage() {
  requireV2Enabled();
  await requireScope('ops:read');

  return (
    <div className="space-y-6">
      <PageHeader
        kicker="Operator · Live"
        title="Live execution feed"
        description="Real-time stream of events — intent lifecycle, policy decisions, execution state, anchor reconciliation. Connects through a hardened server-side SSE proxy."
        meta={<StatusPill tone="accent">SSE · server-proxied</StatusPill>}
      />

      <Card kicker="Stream" title="All events">
        <LiveExecutionStream />
      </Card>
    </div>
  );
}
