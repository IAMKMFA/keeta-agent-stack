import type { Metadata } from 'next';
import Link from 'next/link';
import { IntentPipeline } from '@keeta-agent-stack/visualizer/client';
import { capabilities } from '../../content/capabilities';
import { CapabilityGrid } from '../../components/sections/CapabilityGrid';
import { ArchitectureSection } from '../../components/sections/ArchitectureSection';
import { CTASection } from '../../components/site/CTASection';
import { buildMetadata } from '../../lib/seo';
import { siteConfig } from '../../lib/site-config';

export const metadata: Metadata = buildMetadata({
  path: '/stack',
  title: 'Stack',
  description:
    'Every layer of the Keeta Agent Stack — SDK, agent runtime, route engine, policy engine, simulation layer, worker signing, MCP tools, event/webhook system, and operator dashboard.',
});

interface FlowEntry {
  readonly id: string;
  readonly stage: string;
  readonly summary: string;
  readonly evidence: ReadonlyArray<string>;
}

const flow: ReadonlyArray<FlowEntry> = [
  {
    id: 'intent',
    stage: 'Intent',
    summary:
      'Typed `ExecutionIntent` describing what the agent wants to do. Authored via SDK, MCP, or the dashboard.',
    evidence: ['packages/sdk', 'packages/types', 'apps/api'],
  },
  {
    id: 'quote',
    stage: 'Quote',
    summary:
      'Adapters return priced offers in parallel. Each quote carries fees, latency, and freshness windows.',
    evidence: ['packages/adapter-registry', 'packages/adapter-keeta-transfer'],
  },
  {
    id: 'route',
    stage: 'Route',
    summary:
      'The route engine scores hops and picks a single- or multi-hop plan. Picks are explainable and replayable.',
    evidence: ['packages/routing'],
  },
  {
    id: 'policy',
    stage: 'Policy',
    summary:
      'Named policy packs evaluate limits, allowlists, freshness, and kill-switch state before any signing material is touched.',
    evidence: ['packages/policy', 'apps/api/src/lib/auth.ts'],
  },
  {
    id: 'simulate',
    stage: 'Simulate',
    summary:
      'The simulator computes account-level deltas and surfaces failure modes — bit-for-bit parity with adapter contracts.',
    evidence: ['packages/simulator'],
  },
  {
    id: 'execute',
    stage: 'Execute',
    summary:
      'The worker is the canonical signer. BullMQ queues, kill switch, KMS-aware signer registry, reconciliation worker.',
    evidence: ['apps/worker', 'packages/keeta'],
  },
  {
    id: 'audit',
    stage: 'Audit',
    summary:
      'Receipts, audit hashes, signed webhooks, and Prometheus exposition. Operators close the loop without touching custody.',
    evidence: ['packages/events', 'packages/telemetry', 'apps/api · /audits'],
  },
];

interface FitEntry {
  readonly id: string;
  readonly title: string;
  readonly role: string;
  readonly body: string;
}

const fitTogether: ReadonlyArray<FitEntry> = [
  {
    id: 'sdk',
    title: 'SDK',
    role: 'Authoring',
    body: 'Typed REST client. Used by templates, examples, your services, and this website.',
  },
  {
    id: 'api',
    title: 'API',
    role: 'Control plane',
    body: 'Receives intents, returns plans, persists audit records. Stateless service over Postgres + BullMQ queues.',
  },
  {
    id: 'mcp',
    title: 'MCP',
    role: 'Agent surface',
    body: '40+ tools so an LLM can read and (with explicit opt-in) execute. Inline seeds rejected by default.',
  },
  {
    id: 'worker',
    title: 'Worker',
    role: 'Execution plane',
    body: 'The canonical signer. Owns custody. KMS-ready. Honours the kill switch on every dequeue.',
  },
  {
    id: 'dashboard',
    title: 'Dashboard',
    role: 'Operator console',
    body: 'Role-based Next.js console. Watches intents, kill switches, anchor bonds, and webhooks via SSE.',
  },
];

export default function StackPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">The stack</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold text-white md:text-6xl">
          One repo. Nine layers. Strict boundaries.
        </h1>
        <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-zinc-300">
          The Agent Stack ships a complete execution surface — control plane, worker, MCP, and
          authoring SDK — without gluing in third-party black boxes. Every layer is auditable,
          composable, and replaceable.
        </p>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">The pipeline</h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Intent → Quote → Route → Policy → Simulate → Execute → Audit. Seven typed boundaries.
          Every stage has a name, a contract, and an evidence path.
        </p>
        <div className="mt-6">
          <IntentPipeline />
        </div>

        <ol className="mt-10 grid gap-3 md:grid-cols-2">
          {flow.map((entry, index) => (
            <li
              key={entry.id}
              id={entry.id}
              className="surface-card surface-card-hover flex gap-4 p-5"
            >
              <span className="mt-0.5 inline-flex h-8 w-8 shrink-0 items-center justify-center rounded-full border border-keeta/30 font-mono text-sm text-keeta">
                {(index + 1).toString().padStart(2, '0')}
              </span>
              <div>
                <p className="text-base font-semibold text-white">{entry.stage}</p>
                <p className="mt-1.5 text-sm leading-6 text-zinc-400">{entry.summary}</p>
                <p className="mt-2 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {entry.evidence.join(' · ')}
                </p>
              </div>
            </li>
          ))}
        </ol>
      </section>

      <CapabilityGrid />

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          How they fit together
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          The SDK and MCP author intent. The API persists and dispatches. The worker signs. The
          dashboard observes. Custody only flows in one direction; nothing else does.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-5">
          {fitTogether.map((entry) => (
            <li key={entry.id} className="surface-card flex h-full flex-col p-5">
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                {entry.role}
              </p>
              <p className="mt-2 text-base font-semibold text-white">{entry.title}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{entry.body}</p>
            </li>
          ))}
        </ul>
      </section>

      <ArchitectureSection />

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-2xl font-semibold text-white">Where each layer lives</h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {capabilities.map((capability) => (
            <li
              key={capability.id}
              className="surface-card flex items-center justify-between gap-4 px-5 py-4"
            >
              <div>
                <p className="text-sm font-semibold text-white">{capability.title}</p>
                <p className="font-mono text-xs text-zinc-500">{capability.evidence}</p>
              </div>
              <Link href={capability.href} className="text-sm text-keeta hover:underline">
                Open →
              </Link>
            </li>
          ))}
        </ul>
        <div className="mt-6 text-sm text-zinc-500">
          Browse the workspace at{' '}
          <Link
            href={`${siteConfig.repoUrl}/tree/main`}
            className="text-keeta underline-offset-4 hover:underline"
          >
            {siteConfig.repoUrl.replace('https://', '')}
          </Link>
          .
        </div>
      </section>

      <CTASection
        eyebrow="Build with the stack"
        title="Pick a layer and start there."
        description="The repo is structured so you can adopt one layer at a time — drop in a new policy pack, swap the routing implementation, or write a new adapter against the conformance tests."
        primary={{ label: 'Read the docs', href: '/docs' }}
        secondary={{ label: 'Run the demo', href: '/demo' }}
      />
    </>
  );
}
