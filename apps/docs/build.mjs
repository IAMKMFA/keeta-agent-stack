import { mkdir, writeFile } from 'node:fs/promises';
import { resolve } from 'node:path';

const apiUrl = (
  process.env.NEXT_PUBLIC_API_URL ??
  process.env.API_URL ??
  'http://localhost:3001'
).replace(/\/$/, '');
const docsRoot = resolve('dist');
const guidesRoot = resolve('dist/guides');

const endpointGroups = [
  {
    name: 'Execution Pipeline',
    description:
      'Intent creation, route generation, policy evaluation, simulation, and execution orchestration.',
    endpoints: [
      'GET /intents',
      'POST /intents',
      'GET /intents/:id',
      'POST /intents/:id/quote',
      'POST /intents/:id/route',
      'POST /intents/:id/policy',
      'POST /intents/:id/execute',
      'POST /simulations/run',
      'GET /executions',
    ],
  },
  {
    name: 'Anchors',
    description:
      'Anchor records, bond updates, reconciliation, onboarding, and readiness inspection.',
    endpoints: [
      'GET /anchors',
      'POST /anchors',
      'GET /anchors/:id',
      'PATCH /anchors/:id',
      'POST /anchors/:id/status',
      'PATCH /anchors/:id/bond',
      'POST /anchors/reconcile',
      'POST /anchors/onboarding/run',
    ],
  },
  {
    name: 'Events and Webhooks',
    description:
      'Pull or subscribe to pipeline and anchor lifecycle events, then fan them out to agents.',
    endpoints: [
      'GET /events',
      'GET /events/stream',
      'GET /ops/webhooks',
      'POST /ops/webhooks',
      'PATCH /ops/webhooks/:id',
      'GET /ops/webhook-deliveries',
    ],
  },
  {
    name: 'Policy and Oracle',
    description:
      'Preview policy with custom rule config and call oracle-backed payment intelligence endpoints.',
    endpoints: [
      'GET /policy/rules',
      'POST /policy/evaluate',
      'GET /oracle/status',
      'GET /oracle/tools',
      'GET /oracle/rate',
      'GET /oracle/compare',
      'POST /oracle/mcp/tools/:name',
      'POST /oracle/autopilot/payment-plan',
    ],
  },
];

const guides = [
  {
    slug: 'getting-started',
    title: 'Getting Started',
    summary:
      'Boot the stack locally, create an intent, and drive the full quote -> route -> policy -> execute path.',
    sections: [
      {
        title: 'Run the stack',
        body: 'The monorepo ships a single local control plane: Fastify API, BullMQ worker, Postgres, Redis, dashboard, and examples. The fastest path is to bring up infrastructure first, then run the workspace scripts.',
        code: `pnpm install
docker compose up -d
pnpm db:migrate
pnpm dev:all`,
      },
      {
        title: 'Create a wallet and intent',
        body: 'The API surface is intentionally small. Create a wallet, register an execution intent, then advance it stage by stage or let your agent orchestrator call the same endpoints.',
        code: `curl -X POST "${apiUrl}/wallets/import" \\
  -H "content-type: application/json" \\
  -d '{"label":"Treasury","address":"keeta_demo_wallet"}'

curl -X POST "${apiUrl}/intents" \\
  -H "content-type: application/json" \\
  -d '{
    "walletId":"<wallet-id>",
    "baseAsset":"KTA",
    "quoteAsset":"AED",
    "side":"sell",
    "size":"250",
    "maxSlippageBps":75,
    "mode":"simulate"
  }'`,
      },
      {
        title: 'Drive the pipeline',
        body: 'The worker consumes queue jobs asynchronously, but the API preserves deterministic control over each stage. That makes the SDK usable for both orchestrated agents and operator-driven testing.',
        code: `curl -X POST "${apiUrl}/intents/<intent-id>/quote"
curl -X POST "${apiUrl}/intents/<intent-id>/route"
curl -X POST "${apiUrl}/intents/<intent-id>/policy"
curl -X POST "${apiUrl}/intents/<intent-id>/execute"`,
      },
    ],
  },
  {
    slug: 'adapter-development',
    title: 'Adapter Development',
    summary:
      'Implement a new venue adapter, register it in the registry, and let the router discover it.',
    sections: [
      {
        title: 'Implement the contract',
        body: 'Adapters expose a narrow execution surface: pair support, quote generation, and execution. The registry and conformance tests do the rest, so new venues can slot into the runtime without worker rewrites.',
        code: `import { BaseDexAdapter } from '@keeta-agent-stack/adapter-base';

export class RegionalDexAdapter extends BaseDexAdapter {
  readonly id = 'regional-dex';
  readonly kind = 'dex';

  supportsPair(baseAsset: string, quoteAsset: string) {
    return baseAsset === 'KTA' && ['USDC', 'AED'].includes(quoteAsset);
  }

  async getQuote(ctx) {
    return { success: true, data: { ...ctx, venue: this.id } };
  }

  async execute(ctx) {
    return { success: true, data: { status: 'filled', txId: 'demo-tx' } };
  }
}`,
      },
      {
        title: 'Register adapters',
        body: 'The default dev registry is useful for demos, but integration tests and production stacks can inject their own registry instances. That makes venue combinations deterministic and testable.',
        code: `import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';

const registry = new AdapterRegistry();
registry.register(new RegionalDexAdapter());`,
      },
      {
        title: 'Verify behavior',
        body: 'Use contract tests first, then integration tests with a custom registry. The router already supports multi-hop pathfinding, so a single well-formed adapter can participate in direct or intermediate routes immediately.',
        code: `pnpm --filter @keeta-agent-stack/adapter-base test
pnpm test:integration`,
      },
    ],
  },
  {
    slug: 'policy-composition',
    title: 'Policy Composition',
    summary:
      'Register custom rules, enable or disable them, and compose corridor policy with allOf / anyOf / not.',
    sections: [
      {
        title: 'Register a typed custom rule',
        body: 'Rules accept optional Zod-backed config and run against the full policy context. The engine validates config before evaluation, so admin UIs can safely expose rule settings.',
        code: `import { definePolicyRule, PolicyEngine } from '@keeta-agent-stack/policy';
import { z } from 'zod';

const engine = new PolicyEngine({ includeDefaultRules: false });

engine.register(
  definePolicyRule<{ maxNotional: number }>({
    ruleId: 'org.acme.max-notional',
    priority: 20,
    configSchema: z.object({ maxNotional: z.number().positive() }),
    evaluate: (ctx, config) => ({
      ruleId: 'org.acme.max-notional',
      passed: Number(ctx.intent.size) <= (config?.maxNotional ?? Number.POSITIVE_INFINITY),
      reason: 'Custom notional cap',
    }),
  })
);`,
      },
      {
        title: 'Compose rules',
        body: 'The engine now supports composition definitions and per-entry toggles. That lets you express corridor bundles without unregistering the underlying rule set.',
        code: `import { definePolicyComposition } from '@keeta-agent-stack/policy';

engine.registerComposition(
  definePolicyComposition({
    ruleId: 'org.acme.uae-corridor',
    operator: 'allOf',
    children: ['live_mode_enabled', 'identity_attestation', 'org.acme.max-notional'],
  })
);

engine.disable('live_mode_enabled');
engine.disable('identity_attestation');
engine.disable('org.acme.max-notional');`,
      },
      {
        title: 'Discover metadata',
        body: 'Discovery surfaces can now distinguish plain rules from compositions, show whether an entry is enabled, and expose child relationships for admin panels or audit tooling.',
        code: `const metadata = engine.listRuleMetadata();
// -> [{ ruleId, kind, enabled, operator, children, description, ... }]`,
      },
    ],
  },
  {
    slug: 'operations',
    title: 'Operations',
    summary:
      'Run the system with integration tests, event subscriptions, tracing, and request correlation.',
    sections: [
      {
        title: 'Run integration tests',
        body: 'The integration harness boots isolated Postgres databases, flushes Redis, starts the API and worker in-process, and verifies webhook delivery. It is designed to run both locally and in CI.',
        code: `docker compose up -d
pnpm test:integration`,
      },
      {
        title: 'Enable tracing',
        body: 'Tracing is opt-in. Set an OTLP endpoint or turn on the console exporter, then the API and worker will emit connected spans across queue boundaries for the main execution path.',
        code: `export OTEL_ENABLED=true
export OTEL_EXPORTER_OTLP_ENDPOINT=http://localhost:4318/v1/traces
export OTEL_SERVICE_NAME=keeta-agent-stack`,
      },
      {
        title: 'Subscribe to events',
        body: 'You can consume the same state changes in two ways: long-lived SSE for dashboards and HMAC-signed webhooks for durable downstream systems.',
        code: `curl -N -H "x-ops-key: $OPS_API_KEY" "${apiUrl}/events/stream?limit=100"

curl -X POST "${apiUrl}/ops/webhooks" \\
  -H "Content-Type: application/json" \\
  -H "x-ops-key: $OPS_API_KEY" \\
  -d '{"targetUrl":"https://example.com/keeta","eventTypes":["execution.completed"],"secret":"super-secret"}'`,
      },
      {
        title: 'Expose the API intentionally',
        body: 'Production boot refuses the development signer, disables browser cross-origin access unless you set an allowlist, and keeps Swagger Try-It-Out off unless you explicitly opt in.',
        code: `export NODE_ENV=production
export ALLOW_DEV_SIGNER=false
export API_CORS_ORIGINS=https://dashboard.example
export API_SWAGGER_TRY_IT_OUT_ENABLED=false`,
      },
    ],
  },
];

function escapeHtml(value) {
  return value
    .replaceAll('&', '&amp;')
    .replaceAll('<', '&lt;')
    .replaceAll('>', '&gt;')
    .replaceAll('"', '&quot;');
}

function navLinks(current) {
  return [
    ['Home', './index.html'],
    ['Architecture', './architecture.html'],
    ...guides.map((guide) => [guide.title, `./guides/${guide.slug}.html`]),
  ]
    .map(
      ([label, href]) =>
        `<a class="nav-link${href === current ? ' active' : ''}" href="${href}">${label}</a>`
    )
    .join('');
}

function renderShell({ current, title, eyebrow, lead, body, aside }) {
  return `<!doctype html>
<html lang="en">
  <head>
    <meta charset="utf-8" />
    <meta name="viewport" content="width=device-width, initial-scale=1" />
    <title>${escapeHtml(title)} | Keeta Agent Stack</title>
    <style>
      :root {
        color-scheme: light;
        --bg: #f5f1ea;
        --paper: rgba(255, 255, 255, 0.88);
        --ink: #1d2423;
        --muted: #5f6867;
        --line: rgba(29, 57, 56, 0.14);
        --accent: #2e8d86;
        --accent-deep: #194f4c;
        --code-bg: #0d1716;
        --code-ink: #ebf7f6;
      }
      * { box-sizing: border-box; }
      body {
        margin: 0;
        font-family: ui-sans-serif, system-ui, -apple-system, BlinkMacSystemFont, "Segoe UI", sans-serif;
        background:
          radial-gradient(circle at top left, rgba(46, 141, 134, 0.16), transparent 30%),
          linear-gradient(180deg, #faf7f1, var(--bg));
        color: var(--ink);
      }
      main { max-width: 1180px; margin: 0 auto; padding: 40px 20px 80px; }
      .frame {
        border: 1px solid var(--line);
        border-radius: 30px;
        background: var(--paper);
        box-shadow: 0 20px 48px rgba(20, 38, 37, 0.08);
        backdrop-filter: blur(12px);
      }
      .hero { padding: 28px; }
      .eyebrow {
        display: inline-block;
        letter-spacing: 0.18em;
        text-transform: uppercase;
        color: var(--accent-deep);
        font-weight: 700;
        font-size: 12px;
      }
      h1 { margin: 10px 0 12px; font-size: clamp(2.2rem, 4.8vw, 4rem); line-height: 0.98; }
      p.lead { margin: 0; color: var(--muted); line-height: 1.65; max-width: 58rem; }
      .nav {
        display: flex;
        flex-wrap: wrap;
        gap: 10px;
        margin-top: 20px;
      }
      .nav-link {
        display: inline-flex;
        padding: 10px 14px;
        border-radius: 999px;
        text-decoration: none;
        color: var(--accent-deep);
        border: 1px solid rgba(46, 141, 134, 0.22);
        background: rgba(255, 255, 255, 0.74);
        font-weight: 600;
      }
      .nav-link.active {
        background: linear-gradient(135deg, #2e8d86, #194f4c);
        color: white;
      }
      .layout {
        display: grid;
        gap: 20px;
        margin-top: 20px;
      }
      @media (min-width: 980px) {
        .layout { grid-template-columns: minmax(0, 1.7fr) minmax(260px, 0.9fr); align-items: start; }
      }
      .panel { padding: 24px; }
      .content h2, .content h3 { margin-top: 0; }
      .section + .section { margin-top: 18px; padding-top: 18px; border-top: 1px solid var(--line); }
      .section p { margin: 0; line-height: 1.65; color: var(--muted); }
      pre {
        margin: 14px 0 0;
        padding: 16px;
        overflow-x: auto;
        border-radius: 20px;
        background: var(--code-bg);
        color: var(--code-ink);
        line-height: 1.6;
      }
      code {
        font-family: ui-monospace, SFMono-Regular, Menlo, monospace;
        background: rgba(12, 23, 22, 0.06);
        border-radius: 7px;
        padding: 0.16rem 0.38rem;
      }
      pre code { background: transparent; padding: 0; }
      .card-grid {
        display: grid;
        gap: 16px;
        margin-top: 18px;
      }
      @media (min-width: 900px) {
        .card-grid { grid-template-columns: repeat(2, minmax(0, 1fr)); }
      }
      .card {
        border: 1px solid var(--line);
        border-radius: 24px;
        background: rgba(255, 255, 255, 0.82);
        padding: 20px;
      }
      .card h3 { margin: 0 0 8px; }
      .card p { margin: 0; color: var(--muted); line-height: 1.6; }
      .card a { color: var(--accent-deep); font-weight: 700; text-decoration: none; }
      .aside h3 { margin: 0 0 10px; }
      .aside ul { margin: 0; padding-left: 18px; color: var(--muted); }
      .aside li + li { margin-top: 8px; }
      .footer {
        margin-top: 20px;
        color: var(--muted);
        font-size: 0.95rem;
      }
    </style>
  </head>
  <body>
    <main>
      <section class="frame hero">
        <div class="eyebrow">${escapeHtml(eyebrow)}</div>
        <h1>${escapeHtml(title)}</h1>
        <p class="lead">${escapeHtml(lead)}</p>
        <nav class="nav">${navLinks(current)}</nav>
      </section>

      <section class="layout">
        <article class="frame panel content">${body}</article>
        <aside class="frame panel aside">${aside}</aside>
      </section>

      <p class="footer">
        Live API base: <code>${escapeHtml(apiUrl)}</code>. Live OpenAPI: <code>/openapi.json</code>. Static snapshot:
        <a href="./openapi.json">openapi.json</a>.
      </p>
    </main>
  </body>
</html>`;
}

function renderSections(sections) {
  return sections
    .map(
      (section) => `<section class="section">
  <h2>${escapeHtml(section.title)}</h2>
  <p>${escapeHtml(section.body)}</p>
  ${section.code ? `<pre><code>${escapeHtml(section.code)}</code></pre>` : ''}
</section>`
    )
    .join('');
}

function renderGuide(guide) {
  return renderShell({
    current: `./guides/${guide.slug}.html`,
    title: guide.title,
    eyebrow: 'Guide',
    lead: guide.summary,
    body: renderSections(guide.sections),
    aside: `<h3>Guide Set</h3>
<ul>
  ${guides
    .map(
      (item) =>
        `<li><a href="./${item.slug}.html">${escapeHtml(item.title)}</a> — ${escapeHtml(item.summary)}</li>`
    )
    .join('')}
</ul>`,
  });
}

function renderHome() {
  const guideCards = guides
    .map(
      (guide) => `<article class="card">
  <h3>${escapeHtml(guide.title)}</h3>
  <p>${escapeHtml(guide.summary)}</p>
  <p style="margin-top:12px;"><a href="./guides/${guide.slug}.html">Open guide</a></p>
</article>`
    )
    .join('');

  const endpointCards = endpointGroups
    .map(
      (group) => `<article class="card">
  <h3>${escapeHtml(group.name)}</h3>
  <p>${escapeHtml(group.description)}</p>
  <pre><code>${escapeHtml(group.endpoints.join('\n'))}</code></pre>
</article>`
    )
    .join('');

  return renderShell({
    current: './index.html',
    title: 'Build Keeta-native agents with a durable execution fabric.',
    eyebrow: 'Keeta Agent Stack',
    lead: 'This docs bundle covers the SDK, the control plane API, the worker pipeline, and the operator workflows that make the stack production-oriented without hiding the moving parts.',
    body: `<section class="section">
  <h2>What ships today</h2>
  <p>The repo includes a typed SDK client, a route-aware execution pipeline, multi-hop routing, an extensible policy engine, webhook and SSE event delivery, a Next.js dashboard, and integration tests that run the real API and worker together.</p>
</section>

<section class="section">
  <h2>Key Guides</h2>
  <div class="card-grid">${guideCards}</div>
</section>

<section class="section">
  <h2>Endpoint Groups</h2>
  <div class="card-grid">${endpointCards}</div>
</section>`,
    aside: `<h3>Quick Links</h3>
<ul>
  <li><a href="./openapi.json">Static OpenAPI snapshot</a></li>
  <li><a href="${apiUrl}/openapi.json">Live OpenAPI document</a></li>
  <li><a href="./architecture.html">Architecture overview</a></li>
</ul>`,
  });
}

function renderArchitecture() {
  return renderShell({
    current: './architecture.html',
    title: 'Architecture Overview',
    eyebrow: 'System Design',
    lead: 'The monorepo is organized around an execution pipeline with explicit package boundaries, durable state, and queue-driven fanout.',
    body: renderSections([
      {
        title: 'Control plane',
        body: 'The Fastify API accepts intents, simulations, anchor operations, and webhook administration. It validates inputs with shared Zod schemas, writes durable records, and enqueues work in BullMQ instead of executing synchronously.',
      },
      {
        title: 'Execution worker',
        body: 'The worker owns quote generation, routing, policy evaluation, execution, simulation, reconciliation, metrics sampling, and webhook delivery. The main control loop is durable because each stage persists output before the next one runs.',
      },
      {
        title: 'Shared packages',
        body: 'Packages provide the typed contracts and pluggable behaviors: adapters, registry, routing, policy, simulator, telemetry, events, Keeta chain helpers, and storage repositories. That keeps the API and worker thin and makes integration tests representative.',
      },
      {
        title: 'Operational visibility',
        body: 'Audit events, metric samples, webhook delivery rows, and route scoring adjustments all persist to Postgres. Tracing and request correlation now extend visibility from the API enqueue edge into worker execution and downstream webhook calls.',
      },
    ]),
    aside: `<h3>Packages to Know</h3>
<ul>
  <li><code>packages/sdk</code> — external developer client</li>
  <li><code>packages/routing</code> — route search and scoring</li>
  <li><code>packages/policy</code> — rule engine and compositions</li>
  <li><code>packages/integration-tests</code> — full stack harness</li>
  <li><code>apps/api</code> / <code>apps/worker</code> — control plane runtime</li>
</ul>`,
  });
}

const staticPaths = endpointGroups.reduce((paths, group) => {
  for (const endpoint of group.endpoints) {
    const [method, ...pathParts] = endpoint.split(' ');
    const path = pathParts.join(' ').replace(/:([A-Za-z]+)/g, '{$1}');
    if (!path) continue;
    paths[path] = {
      ...(paths[path] ?? {}),
      [method.toLowerCase()]: {
        summary: group.description,
        tags: [group.name],
      },
    };
  }
  return paths;
}, {});

await mkdir(docsRoot, { recursive: true });
await mkdir(guidesRoot, { recursive: true });

await writeFile(resolve(docsRoot, 'index.html'), renderHome(), 'utf8');
await writeFile(resolve(docsRoot, 'architecture.html'), renderArchitecture(), 'utf8');

for (const guide of guides) {
  await writeFile(resolve(guidesRoot, `${guide.slug}.html`), renderGuide(guide), 'utf8');
}

// `openapi.json` is written by `scripts/snapshot-openapi.ts`, which calls the real
// `buildOpenApiDocument()` from apps/api so this docs bundle ships the canonical
// OpenAPI 3.1 spec (not the abbreviated `endpointGroups` summary above, which is
// only used to render the HTML cards). Run `pnpm --filter @keeta-agent-stack/docs build`
// to invoke both steps.
void staticPaths;

console.log(`Docs written to ${resolve(docsRoot, 'index.html')}`);
