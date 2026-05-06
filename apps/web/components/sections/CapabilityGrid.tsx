import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { capabilities } from '../../content/capabilities';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';

export function CapabilityGrid() {
  return (
    <section id="stack" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">The stack</p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Nine composable layers, one execution surface.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Every layer ships in this repo today. Each card cites the package or app that backs it —
          and links to the deep dive on the developer or stack pages.
        </p>
      </Reveal>

      <Stagger className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {capabilities.map((capability) => {
          const Icon = capability.icon;
          return (
            <StaggerItem key={capability.id}>
              <Link
                href={capability.href}
                className="group surface-card surface-card-hover flex h-full flex-col p-6"
              >
                <div className="flex items-center justify-between">
                  <Icon className="h-5 w-5 text-keeta" aria-hidden />
                  <ArrowUpRight className="h-4 w-4 text-zinc-500 transition-transform group-hover:-translate-y-0.5 group-hover:translate-x-0.5 group-hover:text-keeta" />
                </div>
                <h3 className="mt-5 text-lg font-semibold text-white">{capability.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{capability.summary}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {capability.evidence}
                </p>
              </Link>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
