import type { Metadata } from 'next';
import { useCases } from '../../content/use-cases';
import { CTASection } from '../../components/site/CTASection';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/use-cases',
  title: 'Use Cases',
  description:
    'Where teams put autonomous agents to work — treasury rebalancing, agent payments, fiat onramps, paper trading.',
});

export default function UseCasesPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Use cases</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold text-white md:text-6xl">
          Real flows. Real repo evidence.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-300">
          Each use case below is grounded in a template, an example, or a package that ships in this
          repo today. None of these are hypothetical or roadmap-only.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <div className="grid gap-5 lg:grid-cols-2">
          {useCases.map((useCase) => (
            <article
              key={useCase.id}
              id={useCase.id}
              className="surface-card surface-card-hover p-7"
            >
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {useCase.persona}
              </p>
              <h2 className="mt-3 text-2xl font-semibold text-white">{useCase.title}</h2>
              <p className="mt-3 text-sm leading-7 text-zinc-300">{useCase.summary}</p>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-keeta">
                Outcomes
              </h3>
              <ul className="mt-3 space-y-1.5 text-sm text-zinc-400">
                {useCase.outcomes.map((outcome) => (
                  <li key={outcome} className="flex gap-2">
                    <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-keeta" />
                    <span>{outcome}</span>
                  </li>
                ))}
              </ul>
              <h3 className="mt-6 text-xs font-semibold uppercase tracking-widest text-keeta">
                Repo evidence
              </h3>
              <p className="mt-3 font-mono text-xs text-zinc-500">{useCase.evidence.join(' · ')}</p>
            </article>
          ))}
        </div>
      </section>

      <CTASection
        eyebrow="Pick a starting point"
        title="Run a representative use case end-to-end."
        description="Each use case maps to a template or example in the repo. Clone it, run it locally, and tailor it from there."
        primary={{ label: 'Open Developers', href: '/developers' }}
        secondary={{ label: 'Run the demo', href: '/demo' }}
      />
    </>
  );
}
