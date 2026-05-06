import type { Metadata } from 'next';
import Link from 'next/link';
import { ArrowUpRight } from 'lucide-react';
import { Badge } from '@keeta-agent-stack/ui';
import {
  agentRuntimeSnippet,
  apiOverviewSnippet,
  intentSnippet,
  mcpSnippet,
  quickstartCommandsSnippet,
} from '../../content/code-snippets';
import { examplesCatalogue } from '../../content/examples-catalogue';
import { CodeTerminal } from '../../components/visual/CodeTerminal';
import { CTASection } from '../../components/site/CTASection';
import { siteConfig } from '../../lib/site-config';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/developers',
  title: 'Developers',
  description:
    'SDK quickstart, agent-runtime quickstart, API overview, MCP overview, examples, and starter templates for building autonomous financial agents on the Keeta Agent Stack.',
});

const surfaces = [
  {
    id: 'sdk',
    eyebrow: 'authoring layer',
    title: 'SDK',
    body: 'Typed REST client over the API control plane. The same client this website uses for its read-only previews. Pairs cleanly with `examples/hello-agent` and `examples/paper-trader`.',
    bullets: [
      'Workspace package: `@keeta-agent-stack/sdk` (alpha published).',
      '`createClient(opts)` factory + verb-named methods.',
      'Strict types via `@keeta-agent-stack/types`.',
    ],
    href: `${siteConfig.repoUrl}/tree/main/packages/sdk`,
    cta: 'Open the SDK package',
  },
  {
    id: 'agent-runtime',
    eyebrow: 'composition layer',
    title: 'Agent runtime',
    body: 'Long-running loop with deterministic factories for intents and plans. Optional — you can call the SDK directly. When you want a host with hooks and offline pipelines, this is it.',
    bullets: [
      'Workspace package: `@keeta-agent-stack/agent-runtime`.',
      '`createKeetaAgent({ name, sdk, hooks })`.',
      'Hooks: `onIntent`, `afterRoute`, `afterPolicy`, `afterExecution`, `onError`.',
    ],
    href: `${siteConfig.repoUrl}/tree/main/packages/agent-runtime`,
    cta: 'Open the agent runtime',
  },
  {
    id: 'api',
    eyebrow: 'control plane',
    title: 'API',
    body: 'Fastify 5 service exposing intent, route, simulate, execute, audit, anchor, and webhook routes. Live OpenAPI at `/openapi.json`; Swagger UI at `/docs` while the API is running locally.',
    bullets: [
      'Workspace app: `apps/api`.',
      'RBAC: viewer / operator / admin enforced per protected route.',
      'Static OpenAPI snapshot bundled with `apps/docs`.',
    ],
    href: `${siteConfig.repoUrl}/tree/main/apps/api`,
    cta: 'Open the API service',
  },
  {
    id: 'mcp',
    eyebrow: 'agent surface',
    title: 'MCP',
    body: '40+ Model Context Protocol tools so an LLM agent can read, route, and (with explicit operator opt-in) execute. Inline seed arguments are rejected by default.',
    bullets: [
      'Workspace app: `apps/mcp`.',
      'Tool catalogue: `apps/mcp/TOOLS.md`.',
      'Posture: `MCP_ALLOW_INLINE_SEEDS=false` is the default.',
    ],
    href: `${siteConfig.repoUrl}/blob/main/apps/mcp/TOOLS.md`,
    cta: 'Read the MCP tools catalogue',
  },
];

export default function DevelopersPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Developers</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold text-white md:text-6xl">
          Four entrypoints. One shared pipeline.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-300">
          SDK, agent-runtime, API, or MCP — pick the entrypoint that matches how you ship today.
          Whichever you pick, the same Intent → Quote → Route → Policy → Simulate → Execute → Audit
          pipeline backs your code.
        </p>
        <div className="mt-6 flex flex-wrap gap-2">
          <Link
            href="/docs"
            className="inline-flex items-center gap-1.5 rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-100 hover:border-keeta/40"
          >
            Read the docs
          </Link>
          <Link
            href="/demo"
            className="inline-flex items-center gap-1.5 rounded-md bg-keeta px-4 py-2 text-sm font-semibold text-black"
          >
            Run the demo
          </Link>
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16" id="quickstart">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
          Local development
        </h2>
        <div className="mt-4 space-y-4">
          <CodeTerminal snippet={quickstartCommandsSnippet} />
        </div>
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-16 lg:grid-cols-2" id="sdk">
        <CodeTerminal snippet={intentSnippet} />
        <CodeTerminal snippet={agentRuntimeSnippet} />
        <CodeTerminal snippet={apiOverviewSnippet} />
        <CodeTerminal snippet={mcpSnippet} />
      </section>

      <section className="mx-auto grid max-w-7xl gap-5 px-5 pb-16 lg:grid-cols-2">
        {surfaces.map((surface) => (
          <article
            key={surface.id}
            id={surface.id}
            className="surface-card surface-card-hover flex h-full flex-col p-7"
          >
            <p className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {surface.eyebrow}
            </p>
            <h2 className="mt-2 text-2xl font-semibold text-white">{surface.title}</h2>
            <p className="mt-3 text-sm leading-7 text-zinc-300">{surface.body}</p>
            <ul className="mt-4 space-y-1.5 text-sm text-zinc-400">
              {surface.bullets.map((bullet) => (
                <li key={bullet} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-keeta" />
                  <span>{bullet}</span>
                </li>
              ))}
            </ul>
            <div className="mt-auto pt-6">
              <Link
                href={surface.href}
                className="inline-flex items-center gap-1.5 text-sm text-keeta underline-offset-4 hover:underline"
              >
                {surface.cta} <ArrowUpRight className="h-3.5 w-3.5" aria-hidden />
              </Link>
            </div>
          </article>
        ))}
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16" id="examples">
        <div className="flex items-end justify-between gap-4">
          <div>
            <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Examples</p>
            <h2 className="mt-2 text-2xl font-semibold text-white">
              Ten projects. All real. All run locally.
            </h2>
            <p className="mt-3 max-w-2xl text-sm leading-7 text-zinc-400">
              Each example is in the repo today. Clone, install, run — no marketing-only flows.
            </p>
          </div>
          <Link
            href={`${siteConfig.repoUrl}/tree/main/examples`}
            className="hidden shrink-0 rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-100 hover:border-keeta/40 md:inline-flex"
          >
            Browse on GitHub
          </Link>
        </div>
        <ul className="mt-6 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
          {examplesCatalogue.map((example) => (
            <li key={example.id}>
              <Link
                href={example.href}
                className="surface-card surface-card-hover block h-full p-5 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60"
              >
                <div className="flex items-start justify-between gap-2">
                  <h3 className="text-base font-semibold text-white">{example.title}</h3>
                  <ArrowUpRight className="h-4 w-4 shrink-0 text-zinc-500" aria-hidden />
                </div>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{example.summary}</p>
                <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {example.path}
                </p>
                <div className="mt-3 flex flex-wrap gap-1.5">
                  {example.tags.map((tag) => (
                    <Badge key={tag} tone="neutral" variant="outline">
                      {tag}
                    </Badge>
                  ))}
                </div>
              </Link>
            </li>
          ))}
        </ul>
      </section>

      <CTASection
        eyebrow="Need a hand?"
        title="Discussions, advisories, and issues all live on GitHub."
        description="We do not run a paid bug-bounty program but we credit reporters in the security advisory and CHANGELOG."
        primary={{ label: 'Open a discussion', href: siteConfig.discussionsUrl }}
        secondary={{ label: 'Report a vulnerability', href: siteConfig.advisoriesUrl }}
      />
    </>
  );
}
