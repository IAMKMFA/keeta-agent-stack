import Link from 'next/link';
import { Button, Card, PageHeader, StatusPill } from '../../components/ui';
import { getViewer } from '../../lib/auth';
import { roleHome } from '../../lib/permissions';

export const metadata = { title: 'Access denied — Keeta Agent Hub' };

export default async function ForbiddenPage() {
  const viewer = await getViewer();
  const home = roleHome(viewer.role);
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="403"
        title="Access denied"
        description="Your current role does not grant access to this surface. If you expected different access, contact an administrator."
        meta={<StatusPill tone="warning">Forbidden</StatusPill>}
      />
      <Card>
        <div className="flex flex-col gap-3">
          <div className="text-sm text-[var(--keeta-muted)]">
            Signed in as{' '}
            <span className="font-medium text-[var(--keeta-ink)]">
              {viewer.displayName ?? viewer.role}
            </span>
            .
          </div>
          <div className="flex flex-wrap gap-2">
            <Link href={home}>
              <Button variant="primary">Return home</Button>
            </Link>
            <Link href="/">
              <Button variant="secondary">Dashboard root</Button>
            </Link>
          </div>
        </div>
      </Card>
    </div>
  );
}
