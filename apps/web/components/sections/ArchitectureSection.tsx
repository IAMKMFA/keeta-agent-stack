import { RouteGraph, SettlementRailMap } from '@keeta-agent-stack/visualizer/client';
import { Reveal } from '../motion/Reveal';
import { NetworkBackground } from '../visual/NetworkBackground';

const planes = [
  {
    title: 'Control plane',
    body: 'Fastify API + operator dashboard + MCP server. Handles intents, routes, simulations, audits, and role-based access.',
    members: ['apps/api', 'apps/dashboard', 'apps/mcp'],
  },
  {
    title: 'Execution plane',
    body: 'Worker that owns custody. BullMQ queues, reconciliation, kill switch, KMS-aware signer registry. The only signer in the canonical pipeline.',
    members: ['apps/worker', 'packages/keeta', 'packages/adapter-keeta-transfer'],
  },
  {
    title: 'Authoring plane',
    body: 'SDK, agent runtime, examples, and templates. The website itself, your CI scripts, and your LLM agents live here.',
    members: ['packages/sdk', 'packages/agent-runtime', 'examples/*', 'templates/*'],
  },
];

export function ArchitectureSection() {
  return (
    <section id="architecture" className="relative isolate overflow-hidden">
      <NetworkBackground className="opacity-40" />
      <div className="relative mx-auto max-w-7xl px-5 py-20">
        <Reveal>
          <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Architecture</p>
          <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
            Three planes. Strict boundaries between them.
          </h2>
          <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
            The control plane proposes work. The execution plane signs and settles. The authoring
            plane defines intent. Custody flows in one direction; nothing else does.
          </p>
        </Reveal>

        <div className="mt-10 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
          <RouteGraph />
          <SettlementRailMap />
        </div>

        <div className="mt-10 grid gap-5 md:grid-cols-3">
          {planes.map((plane) => (
            <article
              key={plane.title}
              className="surface-card surface-card-hover flex h-full flex-col p-6"
            >
              <h3 className="text-lg font-semibold text-white">{plane.title}</h3>
              <p className="mt-3 text-sm leading-7 text-zinc-400">{plane.body}</p>
              <ul className="mt-5 space-y-1 font-mono text-xs text-zinc-500">
                {plane.members.map((member) => (
                  <li key={member}>{member}</li>
                ))}
              </ul>
            </article>
          ))}
        </div>
      </div>
    </section>
  );
}
