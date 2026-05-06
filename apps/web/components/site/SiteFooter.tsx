import Link from 'next/link';
import { StatusPill } from '@keeta-agent-stack/ui';
import { footerNav } from '../../content/nav';
import { siteConfig } from '../../lib/site-config';
import { publicEnv } from '../../lib/env';

export function SiteFooter() {
  const year = new Date().getFullYear();
  return (
    <footer className="mt-24 border-t border-white/10 bg-panel/40">
      <div className="mx-auto grid max-w-7xl gap-10 px-5 py-12 md:grid-cols-[1.4fr_repeat(3,1fr)]">
        <div>
          <Link href="/" className="flex items-center gap-3 font-semibold text-white">
            <span aria-hidden className="h-3 w-3 rounded-full bg-keeta shadow-glow" />
            {siteConfig.name}
          </Link>
          <p className="mt-3 max-w-xs text-sm leading-6 text-zinc-400">
            Open-source execution layer for autonomous financial agents. Apache-2.0.
          </p>
        </div>
        {footerNav.map((column) => (
          <div key={column.heading}>
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {column.heading}
            </h2>
            <ul className="mt-4 space-y-2 text-sm">
              {column.links.map((link) => (
                <li key={link.href}>
                  <Link
                    href={link.href}
                    className="text-zinc-300 transition-colors hover:text-white"
                  >
                    {link.label}
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
      </div>
      <div className="border-t border-white/5">
        <div className="mx-auto flex max-w-7xl flex-col gap-2 px-5 py-5 text-xs text-zinc-500 md:flex-row md:items-center md:justify-between">
          <p>© {year} Keeta Agent Stack contributors. Apache-2.0 licensed.</p>
          <div className="flex items-center gap-2 font-mono">
            <span>Status:</span>
            <StatusPill status={publicEnv.liveMode ? 'live' : 'demo'}>
              {publicEnv.liveMode ? 'live · read-only' : 'demo mode'}
            </StatusPill>
            <span className="hidden sm:inline">— live mode requires explicit env opt-in.</span>
          </div>
        </div>
      </div>
    </footer>
  );
}
