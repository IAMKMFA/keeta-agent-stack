'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import clsx from 'clsx';
import { LiveOpsRail } from './LiveOpsRail';
import type { NavItem } from '../lib/nav';
import type { Role } from '../lib/permissions';

interface ShellViewerProps {
  role: Role;
  displayName?: string;
  tenantId?: string;
}

interface ShellProps {
  viewer: ShellViewerProps;
  nav: readonly NavItem[];
  children: React.ReactNode;
}

const ROLE_LABEL: Record<Role, string> = {
  admin: 'Admin',
  operator: 'Operator',
  tenant: 'Tenant',
  exec: 'Executive',
  anonymous: 'Anonymous',
};

const ROLE_TONE: Record<Role, string> = {
  admin: 'bg-[var(--keeta-danger-soft)] text-[var(--keeta-danger)]',
  operator: 'bg-[var(--keeta-accent-soft)] text-[#225f5c]',
  tenant: 'bg-[rgba(20,117,152,0.12)] text-[var(--keeta-accent-deep)]',
  exec: 'bg-[var(--keeta-warning-soft)] text-[var(--keeta-warning)]',
  anonymous: 'bg-[rgba(128,127,127,0.12)] text-[var(--keeta-muted)]',
};

const GROUP_LABELS: Record<NonNullable<NavItem['group']>, string> = {
  ops: 'Operations',
  platform: 'Platform',
  tenant: 'Workspace',
  exec: 'Overview',
  reference: 'Reference',
};

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

function groupNav(nav: readonly NavItem[]): Array<[string, NavItem[]]> {
  const map = new Map<string, NavItem[]>();
  for (const item of nav) {
    const key = item.group ?? 'platform';
    const list = map.get(key) ?? [];
    list.push(item);
    map.set(key, list);
  }
  const order: NavItem['group'][] = ['ops', 'exec', 'tenant', 'platform', 'reference'];
  const out: Array<[string, NavItem[]]> = [];
  for (const key of order) {
    const list = map.get(key ?? 'platform');
    if (list && list.length > 0) out.push([key ?? 'platform', list]);
  }
  return out;
}

export function Shell({ viewer, nav, children }: ShellProps) {
  const pathname = usePathname();
  const grouped = groupNav(nav);

  return (
    <div className="min-h-screen pb-8 pt-4 sm:pt-6">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="hub-panel overflow-hidden">
          <div className="lg:grid lg:grid-cols-[260px_minmax(0,1fr)]">
            <aside className="hidden border-r border-[var(--keeta-line)] bg-[linear-gradient(180deg,#ffffff,rgba(250,250,250,0.9))] p-6 lg:flex lg:flex-col">
              <div className="space-y-2">
                <div className="hub-kicker">Keeta</div>
                <div className="hub-heading text-2xl font-semibold tracking-tight">Agent Hub</div>
                <p className="text-sm text-[var(--keeta-muted)]">
                  Institutional control plane for agent-orchestrated settlement.
                </p>
              </div>
              <nav className="mt-7 space-y-5">
                {grouped.map(([group, items]) => (
                  <div key={group} className="space-y-1.5">
                    <div className="hub-kicker px-1 text-[10px]">
                      {GROUP_LABELS[group as NonNullable<NavItem['group']>] ?? 'More'}
                    </div>
                    {items.map((item) => {
                      const active = isActive(pathname, item.href);
                      return (
                        <Link
                          key={item.href}
                          href={item.href}
                          className={clsx(
                            'group flex items-center justify-between rounded-xl px-3 py-2 text-sm transition',
                            active
                              ? 'bg-[var(--keeta-accent-soft)] text-[var(--keeta-ink)]'
                              : 'text-[#595757] hover:bg-[#f1f2f2]'
                          )}
                        >
                          <span>{item.label}</span>
                          <span
                            className={clsx(
                              'h-1.5 w-1.5 rounded-full transition',
                              active
                                ? 'bg-[var(--keeta-accent)] animate-glow'
                                : 'bg-[#d3d3d3] group-hover:bg-[#9a9999]'
                            )}
                          />
                        </Link>
                      );
                    })}
                  </div>
                ))}
              </nav>
              <div className="mt-auto space-y-2">
                <div className="flex items-center gap-2">
                  <span
                    className={clsx(
                      'inline-flex items-center gap-1 rounded-full px-2 py-0.5 font-mono text-[10px] uppercase tracking-wider',
                      ROLE_TONE[viewer.role]
                    )}
                  >
                    {ROLE_LABEL[viewer.role]}
                  </span>
                  {viewer.tenantId ? (
                    <span className="font-mono text-[10px] text-[var(--keeta-muted)]">
                      {viewer.tenantId}
                    </span>
                  ) : null}
                </div>
                {viewer.displayName ? (
                  <div className="text-sm font-medium text-[var(--keeta-ink)]">
                    {viewer.displayName}
                  </div>
                ) : null}
                <div className="rounded-xl border border-[var(--keeta-line)] bg-[#fafafa] px-3 py-2 text-[11px] text-[var(--keeta-muted)]">
                  <div className="font-mono">Keeta network</div>
                </div>
              </div>
            </aside>

            <section className="min-w-0">
              <header className="border-b border-[var(--keeta-line)] bg-white/85 px-5 py-4 sm:px-7 lg:px-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="hub-kicker">Execution Fabric</div>
                    <div className="hub-heading text-xl font-semibold lg:hidden">Keeta Agent Hub</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <LiveOpsRail />
                    <div className="hub-pill px-3 py-1.5">
                      {ROLE_LABEL[viewer.role]}
                    </div>
                  </div>
                </div>
                <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {nav.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={clsx(
                          'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition',
                          active
                            ? 'border-[rgba(50,149,144,0.5)] bg-[var(--keeta-accent-soft)] text-[#225f5c]'
                            : 'border-[var(--keeta-line)] bg-white text-[#5f5d5d]'
                        )}
                      >
                        {item.label}
                      </Link>
                    );
                  })}
                </nav>
              </header>
              <main className="space-y-8 p-5 sm:p-7 lg:p-10">{children}</main>
            </section>
          </div>
        </div>
      </div>
    </div>
  );
}
