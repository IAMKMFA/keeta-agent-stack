'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { LiveOpsRail } from './LiveOpsRail';

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/templates', label: 'Templates' },
  { href: '/wallets', label: 'Wallets' },
  { href: '/intents', label: 'Intents' },
  { href: '/routes', label: 'Routes' },
  { href: '/executions', label: 'Executions' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/adapters', label: 'Adapters' },
  { href: '/anchors', label: 'Anchors' },
  { href: '/ops', label: 'Ops' },
];

function isActive(pathname: string, href: string): boolean {
  if (href === '/') return pathname === '/';
  return pathname === href || pathname.startsWith(`${href}/`);
}

export function Shell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();

  return (
    <div className="min-h-screen pb-8 pt-4 sm:pt-6">
      <div className="mx-auto max-w-[1600px] px-4 sm:px-6 lg:px-8">
        <div className="hub-panel overflow-hidden">
          <div className="lg:grid lg:grid-cols-[250px_minmax(0,1fr)]">
            <aside className="hidden border-r border-[var(--hub-line)] bg-[linear-gradient(180deg,#ffffff,rgba(250,250,250,0.9))] p-7 lg:flex lg:flex-col">
              <div className="space-y-2">
                <div className="hub-kicker">Keeta Hub</div>
                <div className="hub-heading text-2xl font-semibold tracking-tight">Agent SDK</div>
                <p className="text-sm text-[var(--hub-muted)]">
                  Command center for strategy orchestration, oracle flows, and execution telemetry.
                </p>
              </div>
              <nav className="mt-8 space-y-1.5">
                {nav.map((item) => {
                  const active = isActive(pathname, item.href);
                  return (
                    <Link
                      key={item.href}
                      href={item.href}
                      className={[
                        'group flex items-center justify-between rounded-xl px-3 py-2.5 text-sm transition',
                        active
                          ? 'bg-[rgba(50,149,144,0.13)] text-[var(--hub-ink)]'
                          : 'text-[#595757] hover:bg-[#f1f2f2]',
                      ].join(' ')}
                    >
                      <span>{item.label}</span>
                      <span
                        className={[
                          'h-1.5 w-1.5 rounded-full transition',
                          active ? 'bg-[var(--hub-accent)] animate-glow' : 'bg-[#d3d3d3] group-hover:bg-[#9a9999]',
                        ].join(' ')}
                      />
                    </Link>
                  );
                })}
              </nav>
              <div className="mt-auto rounded-xl border border-[var(--hub-line)] bg-[#fafafa] px-4 py-3 text-xs text-[var(--hub-muted)]">
                Localhost control plane.
                <div className="mt-1 font-mono text-[11px] text-[#616060]">Powered by Keeta + Oracle + MCP</div>
              </div>
            </aside>

            <section className="min-w-0">
              <header className="border-b border-[var(--hub-line)] bg-white/85 px-5 py-4 sm:px-7 lg:px-10">
                <div className="flex items-center justify-between gap-4">
                  <div>
                    <div className="hub-kicker">Execution Fabric</div>
                    <div className="hub-heading text-xl font-semibold lg:hidden">Keeta Agent SDK</div>
                  </div>
                  <div className="flex items-center gap-3">
                    <LiveOpsRail />
                    <div className="hub-pill px-3 py-1.5">Plug &amp; Play</div>
                  </div>
                </div>
                <nav className="mt-4 flex gap-2 overflow-x-auto pb-1 lg:hidden">
                  {nav.map((item) => {
                    const active = isActive(pathname, item.href);
                    return (
                      <Link
                        key={item.href}
                        href={item.href}
                        className={[
                          'whitespace-nowrap rounded-full border px-3 py-1.5 text-xs transition',
                          active
                            ? 'border-[rgba(50,149,144,0.5)] bg-[rgba(50,149,144,0.14)] text-[#225f5c]'
                            : 'border-[var(--hub-line)] bg-white text-[#5f5d5d]',
                        ].join(' ')}
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
