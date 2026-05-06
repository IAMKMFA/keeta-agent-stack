import Link from 'next/link';
import { ArrowRight } from 'lucide-react';

export function Hero() {
  return (
    <section className="mx-auto grid max-w-7xl gap-8 px-5 py-16 lg:grid-cols-[1.05fr_0.95fr] lg:py-24">
      <div>
        <p className="mb-4 text-sm font-semibold uppercase text-keeta">
          Keeta at the routing center
        </p>
        <h1 className="max-w-4xl text-5xl font-semibold leading-tight text-white md:text-7xl">
          Agent-ready crypto and payment execution.
        </h1>
        <p className="mt-6 max-w-2xl text-lg leading-8 text-zinc-300">
          Route swaps, ramp flows, and machine API payments through the existing adapter registry,
          router, simulator, and policy engine.
        </p>
        <Link
          href="https://github.com/IAMKMFA/keeta-agent-stack#quickstart"
          className="mt-8 inline-flex items-center gap-2 rounded-md bg-keeta px-5 py-3 font-semibold text-black"
        >
          Run it locally <ArrowRight className="h-4 w-4" />
        </Link>
      </div>
      <div className="rounded-lg border border-white/10 bg-panel p-6 shadow-glow">
        <div className="grid gap-4">
          {['Source asset', 'Keeta route', 'Policy gate', 'Simulated receipt'].map(
            (label, index) => (
              <div key={label} className="rounded-md border border-line bg-black/25 p-4">
                <p className="text-xs uppercase text-zinc-500">step {index + 1}</p>
                <p className="mt-2 text-lg font-medium">{label}</p>
              </div>
            )
          )}
        </div>
      </div>
    </section>
  );
}
