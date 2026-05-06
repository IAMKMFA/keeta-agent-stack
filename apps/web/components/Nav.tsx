import Link from 'next/link';
import { Github } from 'lucide-react';

const links: Array<[string, string]> = [
  ['Super Swap', '/superswap'],
  ['Ramps', '/ramps'],
  ['Connectivity', '/connectivity'],
  ['Agents', '/agents'],
];

export function Nav() {
  return (
    <header className="sticky top-0 z-20 border-b border-white/10 bg-graphite/85 backdrop-blur">
      <nav className="mx-auto flex max-w-7xl items-center justify-between px-5 py-4">
        <Link href="/" className="flex items-center gap-3 font-semibold tracking-wide">
          <span className="h-3 w-3 rounded-full bg-keeta shadow-glow" />
          Keeta Agent Stack
        </Link>
        <div className="hidden items-center gap-6 text-sm text-zinc-300 md:flex">
          {links.map(([label, href]) => (
            <Link key={href} href={href} className="hover:text-white">
              {label}
            </Link>
          ))}
        </div>
        <Link
          href="https://github.com/IAMKMFA/keeta-agent-stack"
          className="inline-flex h-9 w-9 items-center justify-center rounded-md border border-white/10 text-zinc-300 hover:text-white"
          title="GitHub"
        >
          <Github className="h-4 w-4" />
        </Link>
      </nav>
    </header>
  );
}
