'use client';

import Link from 'next/link';
import { useEffect, useState } from 'react';
import { Menu, X } from 'lucide-react';
import { cn } from '../../lib/cn';
import { primaryNav } from '../../content/nav';
import { siteConfig } from '../../lib/site-config';

export function MobileNav() {
  const [open, setOpen] = useState(false);

  useEffect(() => {
    if (!open) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = 'hidden';
    return () => {
      document.body.style.overflow = previous;
    };
  }, [open]);

  return (
    <div className="md:hidden">
      <button
        type="button"
        aria-label={open ? 'Close menu' : 'Open menu'}
        aria-expanded={open}
        onClick={() => setOpen((v) => !v)}
        className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-200 hover:text-white"
      >
        {open ? <X className="h-4 w-4" /> : <Menu className="h-4 w-4" />}
      </button>

      <div
        className={cn(
          'fixed inset-x-0 top-[57px] z-30 border-b border-white/10 bg-graphite/95 backdrop-blur transition-all duration-200',
          open ? 'translate-y-0 opacity-100' : 'pointer-events-none -translate-y-2 opacity-0'
        )}
      >
        <nav className="flex flex-col gap-1 px-5 py-4 text-sm">
          {primaryNav.map((link) => (
            <Link
              key={link.href}
              href={link.href}
              onClick={() => setOpen(false)}
              className="rounded-md px-3 py-2 text-zinc-200 hover:bg-white/5 hover:text-white"
            >
              <span className="font-medium">{link.label}</span>
              {link.description ? (
                <span className="ml-2 text-zinc-500">{link.description}</span>
              ) : null}
            </Link>
          ))}
          <Link
            href={siteConfig.repoUrl}
            onClick={() => setOpen(false)}
            className="mt-2 rounded-md border border-white/10 px-3 py-2 text-center font-medium text-keeta hover:border-keeta/40"
          >
            View on GitHub
          </Link>
        </nav>
      </div>
    </div>
  );
}
