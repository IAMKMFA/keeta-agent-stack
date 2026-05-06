import { ecosystemCards } from '../../content/home';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';

export function EcosystemSection() {
  return (
    <section id="ecosystem" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Ecosystem</p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Plays well with what you already run.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Postgres, Redis, BullMQ, OpenTelemetry, Prometheus, Pino, Drizzle, Cloud KMS, MCP. None of
          this is reinvented; the stack composes the things you already operate.
        </p>
      </Reveal>

      <Stagger className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {ecosystemCards.map((card) => (
          <StaggerItem key={card.title}>
            <article className="surface-card surface-card-hover flex h-full flex-col p-6">
              <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
                {card.category}
              </p>
              <h3 className="mt-3 text-lg font-semibold text-white">{card.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{card.summary}</p>
            </article>
          </StaggerItem>
        ))}
      </Stagger>
    </section>
  );
}
