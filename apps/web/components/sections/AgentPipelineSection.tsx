import { IntentPipeline } from '@keeta-agent-stack/visualizer/client';
import { pipelineStages } from '../../content/home';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';

export function AgentPipelineSection() {
  return (
    <section id="pipeline" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">The pipeline</p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Intent → Quote → Route → Policy → Simulate → Execute → Audit.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Every agent action goes through the same seven stages. No stage is optional and no stage
          is hidden. Each one is a typed boundary you can audit, replace, or rewrite without
          touching the others.
        </p>
      </Reveal>

      <div className="mt-10">
        <IntentPipeline />
      </div>

      <Stagger className="mt-10 grid gap-4 md:grid-cols-2 lg:grid-cols-7">
        {pipelineStages.map((stage, index) => {
          const Icon = stage.icon;
          return (
            <StaggerItem key={stage.id}>
              <article className="surface-card surface-card-hover h-full p-5">
                <div className="flex items-center gap-3">
                  <span className="font-mono text-xs text-zinc-500">
                    {(index + 1).toString().padStart(2, '0')}
                  </span>
                  <Icon className="h-4 w-4 text-keeta" aria-hidden />
                </div>
                <h3 className="mt-3 text-base font-semibold text-white">{stage.title}</h3>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">{stage.summary}</p>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
