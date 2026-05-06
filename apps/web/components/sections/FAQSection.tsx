import { faqEntries } from '../../content/faq';
import { Reveal } from '../motion/Reveal';

export function FAQSection() {
  return (
    <section id="faq" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Frequently asked
        </p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Answers, with citations.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Every answer below points back at the repo or `SECURITY.md`. We don’t paraphrase
          guarantees we can’t enforce.
        </p>
      </Reveal>

      <div className="mt-10 divide-y divide-white/10 overflow-hidden rounded-2xl border border-white/10 bg-panel/40">
        {faqEntries.map((entry) => (
          <details
            key={entry.id}
            className="group px-6 py-5 [&_summary::-webkit-details-marker]:hidden"
          >
            <summary className="flex cursor-pointer items-center justify-between gap-6 text-left text-base font-semibold text-white">
              {entry.question}
              <span aria-hidden className="text-zinc-500 transition-transform group-open:rotate-45">
                +
              </span>
            </summary>
            <p className="mt-3 text-sm leading-7 text-zinc-400">{entry.answer}</p>
          </details>
        ))}
      </div>
    </section>
  );
}
