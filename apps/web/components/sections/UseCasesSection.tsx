import Link from 'next/link';
import { useCases } from '../../content/use-cases';
import { Reveal } from '../motion/Reveal';

export function UseCasesSection() {
  return (
    <section id="use-cases" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Use cases</p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Where teams put autonomous agents to work.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Each use case is a real path through this repo — the templates, examples, and packages
          that back the story are linked alongside.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-5 lg:grid-cols-2">
        {useCases.map((useCase) => (
          <article key={useCase.id} className="surface-card surface-card-hover flex flex-col p-6">
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {useCase.persona}
            </p>
            <h3 className="mt-3 text-xl font-semibold text-white">{useCase.title}</h3>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{useCase.summary}</p>
            <ul className="mt-5 space-y-1.5 text-sm text-zinc-400">
              {useCase.outcomes.map((outcome) => (
                <li key={outcome} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-keeta" />
                  <span>{outcome}</span>
                </li>
              ))}
            </ul>
            <p className="mt-5 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
              {useCase.evidence.join(' · ')}
            </p>
            <div className="mt-6">
              <Link
                href="/use-cases"
                className="text-sm text-keeta underline-offset-4 hover:underline"
              >
                Read the deep dive →
              </Link>
            </div>
          </article>
        ))}
      </div>
    </section>
  );
}
