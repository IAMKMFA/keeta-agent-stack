import Link from 'next/link';
import { Github } from 'lucide-react';
import { primaryNav } from '../../content/nav';
import { siteConfig } from '../../lib/site-config';
import { MobileNav } from './MobileNav';

export function SiteHeader() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-graphite/88 shadow-[0_1px_0_rgba(255,255,255,0.03)] backdrop-blur-xl supports-[backdrop-filter]:bg-graphite/70">
      <div className="mx-auto flex max-w-7xl items-center justify-between gap-6 px-5 py-3.5">
        <Link
          href="/"
          className="rounded-md px-1 py-1 -ml-1 flex items-center gap-3 font-semibold tracking-wide text-white transition-colors hover:text-keeta"
        >
          <span aria-hidden className="h-3 w-3 rounded-full bg-keeta shadow-glow" />
          <span>{siteConfig.name}</span>
        </Link>

        <nav className="hidden items-center gap-1 text-sm md:flex" aria-label="Primary">
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              className="rounded-md px-3 py-2 text-zinc-300 transition-colors hover:bg-white/5 hover:text-white focus-visible:ring-2 focus-visible:ring-keeta/70"
            >
              {link.label}
            </Link>
          ))}
        </nav>

        <div className="flex items-center gap-2">
          <Link
            href={siteConfig.repoUrl}
            className="hidden h-9 items-center gap-2 rounded-md border border-white/10 px-3 text-sm text-zinc-200 transition-colors hover:border-white/30 hover:text-white focus-visible:ring-2 focus-visible:ring-keeta/70 md:inline-flex"
            aria-label="View source on GitHub"
          >
            <Github className="h-4 w-4" />
            GitHub
          </Link>
          <MobileNav />
        </div>
      </div>
    </header>
  );
}
