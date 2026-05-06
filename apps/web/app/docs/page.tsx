import type { Metadata } from 'next';
import Link from 'next/link';
import { Container, FeatureCard, Section } from '@keeta-agent-stack/ui';
import { siteConfig } from '../../lib/site-config';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/docs',
  title: 'Docs',
  description:
    'Documentation hub for the Keeta Agent Stack. Links to apps/docs, the OpenAPI spec, Typedoc output, MCP tools catalogue, agent build handbook, and operator guides.',
});

interface DocLink {
  readonly title: string;
  readonly body: string;
  readonly href: string;
  readonly meta: string;
}

interface DocGroup {
  readonly heading: string;
  readonly intro?: string;
  readonly items: ReadonlyArray<DocLink>;
}

const repoFile = (path: string) => `${siteConfig.repoUrl}/blob/main/${path}`;
const repoTree = (path: string) => `${siteConfig.repoUrl}/tree/main/${path}`;

const groups: ReadonlyArray<DocGroup> = [
  {
    heading: 'Reference',
    intro:
      'The canonical, generated reference surface. The site does not re-host this — it links into apps/docs and the live API.',
    items: [
      {
        title: 'apps/docs (static site)',
        body: 'Multi-page docs site bundling getting-started, adapter, policy, operations, and architecture guides plus a static OpenAPI snapshot. Build with `pnpm --filter @keeta-agent-stack/docs build` (output in `apps/docs/dist`).',
        href: repoTree('apps/docs'),
        meta: 'apps/docs',
      },
      {
        title: 'API control plane (OpenAPI)',
        body: 'Live spec at `/openapi.json` and Swagger UI at `/docs` while the API is running locally. A static snapshot is also bundled with `apps/docs/dist/openapi.json`.',
        href: siteConfig.openApiLocalUrl,
        meta: 'apps/api · /openapi.json',
      },
      {
        title: 'Typedoc reference',
        body: 'HTML reference generated from `packages/sdk`, `packages/agent-runtime`, and `packages/types`. Lives in `docs/typedoc/` after the workspace docs task runs.',
        href: repoTree('docs/typedoc'),
        meta: 'docs/typedoc',
      },
      {
        title: 'MCP tools catalogue',
        body: '40+ tools, classified by surface and signing posture. Read this before flipping `MCP_ALLOW_INLINE_SEEDS=true`.',
        href: repoFile('apps/mcp/TOOLS.md'),
        meta: 'apps/mcp/TOOLS.md',
      },
    ],
  },
  {
    heading: 'Guides',
    intro:
      'Hand-written, repo-resident guides. Edit them on GitHub directly; PRs welcome.',
    items: [
      {
        title: 'Agent build handbook',
        body: 'Fresh-clone verification, repo service map, and the `verify:agent` gate. Start here if you are new.',
        href: repoFile('docs/agent-build-handbook.md'),
        meta: 'docs/agent-build-handbook.md',
      },
      {
        title: 'SDK reference',
        body: 'Hand-written companion to the generated Typedoc, with end-to-end examples.',
        href: repoFile('docs/sdk-reference.md'),
        meta: 'docs/sdk-reference.md',
      },
      {
        title: 'Keeta Agent Stack overview',
        body: 'Architectural overview of the stack, how the layers compose, and where to look first.',
        href: repoFile('docs/keeta-agent-stack.md'),
        meta: 'docs/keeta-agent-stack.md',
      },
      {
        title: 'Agent payment rails',
        body: 'Reference for the registered payment rails and how the routing engine scores hops.',
        href: repoFile('docs/agent-payment-rails.md'),
        meta: 'docs/agent-payment-rails.md',
      },
      {
        title: 'Capability matrix',
        body: 'API / SDK / MCP feature parity grid. The single source for "is X supported on Y today?".',
        href: repoFile('docs/capability-matrix.md'),
        meta: 'docs/capability-matrix.md',
      },
      {
        title: 'Creating a new adapter',
        body: 'Conformance tests, contract types, and how to register a new venue safely.',
        href: repoFile('docs/creating-new-adapter.md'),
        meta: 'docs/creating-new-adapter.md',
      },
      {
        title: 'Deployment',
        body: 'Production env hardening, network isolation, secret rotation, observability.',
        href: repoFile('docs/deployment.md'),
        meta: 'docs/deployment.md',
      },
      {
        title: 'Roadmap',
        body: 'Tracked roadmap with status per workstream. Not a marketing document.',
        href: repoFile('docs/next-steps-roadmap.md'),
        meta: 'docs/next-steps-roadmap.md',
      },
    ],
  },
  {
    heading: 'Operator',
    intro: 'For folks running the stack, not just building on it.',
    items: [
      {
        title: 'Operator dashboard contract',
        body: 'Roles, API map, and route inventory for the Next.js operator console.',
        href: repoFile('apps/dashboard/docs/dashboard-v2-contract.md'),
        meta: 'apps/dashboard',
      },
      {
        title: 'Security policy',
        body: 'Reporting, custody boundary, KMS guidance, kill switch, rotation, disclosure.',
        href: siteConfig.securityUrl,
        meta: 'SECURITY.md',
      },
      {
        title: 'Custody guard audit',
        body: 'Phased internal audit of every custody guardrail wired into the runtime.',
        href: repoFile('docs/security/CUSTODY_GUARD_AUDIT.md'),
        meta: 'docs/security',
      },
      {
        title: 'Secret boundary map',
        body: 'Per-process map of which secrets each process can and cannot see.',
        href: repoFile('docs/security/SECRET_BOUNDARY_MAP.md'),
        meta: 'docs/security',
      },
      {
        title: 'Website security claim allowlist',
        body: 'The list of security-flavoured statements this website is allowed to make today, with evidence rows.',
        href: repoFile('docs/web/WEBSITE_SECURITY_CLAIMS.md'),
        meta: 'docs/web',
      },
    ],
  },
  {
    heading: 'Examples and templates',
    intro: 'Read-the-source documentation. Each entry runs locally.',
    items: [
      {
        title: 'examples/',
        body: 'Eight runnable example projects covering hello-world, paper trading, route inspection, oracle settlement, and more.',
        href: repoTree('examples'),
        meta: 'examples/',
      },
      {
        title: 'templates/treasury-rebalancer',
        body: 'Production-shaped starter template. Same guardrails as the rest of the stack; safe to fork.',
        href: repoTree('templates/treasury-rebalancer'),
        meta: 'templates/treasury-rebalancer',
      },
      {
        title: 'examples/mcp-llm-integration.md',
        body: 'Walkthrough for wiring an LLM agent into the MCP server with the right inline-seed posture.',
        href: repoFile('examples/mcp-llm-integration.md'),
        meta: 'examples/mcp-llm-integration.md',
      },
    ],
  },
];

export default function DocsPage() {
  return (
    <>
      <Section
        density="compact"
        eyebrow="Documentation"
        title="A hub, not a duplication."
        description="The website does not re-host long-form docs. This page is a curated set of links into the canonical sources — the apps/docs static site, the live OpenAPI spec, Typedoc HTML, repo guides, and operator contracts."
      >
        {/* spacer for the eyebrow header; content below is grouped */}
      </Section>

      <Container>
        <div className="surface-card mt-2 p-5">
          <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
            Build the docs locally
          </h2>
          <p className="mt-2 text-sm leading-6 text-zinc-300">
            <span className="font-mono text-zinc-100">pnpm --filter @keeta-agent-stack/docs build</span>{' '}
            outputs the static site to <span className="font-mono text-zinc-100">apps/docs/dist</span>{' '}
            including the bundled OpenAPI snapshot. The live API also serves the current spec at{' '}
            <Link
              href={siteConfig.openApiLocalUrl}
              className="font-mono text-keeta hover:underline"
            >
              {siteConfig.openApiLocalUrl}
            </Link>
            . Run{' '}
            <span className="font-mono text-zinc-100">pnpm docs:typedoc</span> at the workspace
            root to regenerate the Typedoc HTML.
          </p>
        </div>

        {groups.map((group) => (
          <div key={group.heading} className="mt-12">
            <h2 className="text-xs font-semibold uppercase tracking-widest text-zinc-500">
              {group.heading}
            </h2>
            {group.intro ? (
              <p className="mt-2 max-w-2xl text-sm leading-6 text-zinc-400">{group.intro}</p>
            ) : null}
            <ul className="mt-4 grid gap-4 md:grid-cols-2 lg:grid-cols-3">
              {group.items.map((item) => (
                <li key={item.title}>
                  <Link
                    href={item.href}
                    className="block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite"
                  >
                    <FeatureCard title={item.title} summary={item.body} footnote={item.meta} />
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        ))}
        <div className="h-16" />
      </Container>
    </>
  );
}
