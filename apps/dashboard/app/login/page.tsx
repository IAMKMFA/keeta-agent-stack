import { Card, PageHeader, StatusPill } from '../../components/ui';

export const metadata = { title: 'Sign in — Keeta Agent Hub' };

export default function LoginPage() {
  return (
    <div className="space-y-6">
      <PageHeader
        kicker="401"
        title="Authentication required"
        description="This dashboard requires a signed JWT. Present a bearer token or complete the SSO flow configured by your deployment."
        meta={<StatusPill tone="info">Unauthenticated</StatusPill>}
      />
      <Card title="How to sign in">
        <ul className="space-y-2 text-sm text-[var(--keeta-muted)]">
          <li>
            <span className="font-medium text-[var(--keeta-ink)]">JWT bearer token.</span>{' '}
            Pass <code className="rounded bg-[#f1f2f2] px-1.5 py-0.5 font-mono text-[11px]">Authorization: Bearer &lt;token&gt;</code>{' '}
            on requests; the token must carry <code className="font-mono text-[11px]">role</code>{' '}
            or <code className="font-mono text-[11px]">dashboard_role</code> claims. See{' '}
            <code className="font-mono text-[11px]">apps/dashboard/docs/dashboard-v2-contract.md</code>.
          </li>
          <li>
            <span className="font-medium text-[var(--keeta-ink)]">Local development.</span>{' '}
            Set <code className="font-mono text-[11px]">DASHBOARD_DEV_VIEWER_ROLE=operator</code>{' '}
            (or admin / tenant / exec) on the dashboard host to stub a viewer without a JWT.
          </li>
        </ul>
      </Card>
    </div>
  );
}
