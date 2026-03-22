import Link from 'next/link';

const nav = [
  { href: '/', label: 'Overview' },
  { href: '/wallets', label: 'Wallets' },
  { href: '/intents', label: 'Intents' },
  { href: '/routes', label: 'Routes' },
  { href: '/executions', label: 'Executions' },
  { href: '/simulations', label: 'Simulations' },
  { href: '/adapters', label: 'Adapters' },
];

export function Shell({ children }: { children: React.ReactNode }) {
  return (
    <div className="min-h-screen flex">
      <aside className="w-56 border-r border-slate-800 bg-slate-900/80 p-6 space-y-6">
        <div>
          <div className="text-lg font-semibold tracking-tight">Keeta Agent</div>
          <p className="text-xs text-slate-500">Execution dashboard</p>
        </div>
        <nav className="space-y-1">
          {nav.map((item) => (
            <Link
              key={item.href}
              href={item.href}
              className="block rounded-md px-3 py-2 text-sm text-slate-300 hover:bg-slate-800 hover:text-white transition"
            >
              {item.label}
            </Link>
          ))}
        </nav>
      </aside>
      <main className="flex-1 p-8">{children}</main>
    </div>
  );
}
