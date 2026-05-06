import Link from 'next/link';
import { getPipelineSnapshot } from '../../lib/api-client';
import { publicEnv } from '../../lib/env';
import { Reveal } from '../motion/Reveal';
import { DemoModeBoard } from './DemoModeBoard';

/**
 * Async server component. Pre-fetches the snapshot (which is itself
 * gated by env flags and falls back to demo fixtures on any failure),
 * then hands control to the `DemoModeBoard` client component for the
 * Sim / Live toggle and the visual event log.
 */
export async function InteractiveDemoSection() {
  const snapshot = await getPipelineSnapshot();

  return (
    <section id="demo" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-keeta">
              Interactive demo
            </p>
            <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
              See an intent travel the whole pipeline.
            </h2>
            <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
              Toggle between a deterministic <span className="text-keeta">simulation</span> and a
              read-only <span className="text-cyanline">live mode preview</span>. The page never
              calls a backend unless an operator opts in via env flags — and even then, only the
              read-only public endpoints are touched.
            </p>
          </div>
          <Link
            href="/demo"
            className="hidden shrink-0 rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-100 hover:border-keeta/40 md:inline-flex"
          >
            Open the full demo
          </Link>
        </div>
      </Reveal>

      <div className="mt-10">
        <DemoModeBoard snapshot={snapshot} liveModeEnabled={publicEnv.liveMode} />
      </div>
    </section>
  );
}
