import type { Metadata } from 'next';
import Link from 'next/link';
import { SecurityModelSection } from '../../components/sections/SecurityModelSection';
import { CTASection } from '../../components/site/CTASection';
import { siteConfig } from '../../lib/site-config';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/security',
  title: 'Security',
  description:
    'Custody guardrails, signing posture, MCP inline-seed rules, env boundaries, audit trail, and disclosure process for the Keeta Agent Stack.',
});

interface Claim {
  readonly title: string;
  readonly body: string;
  readonly evidence: string;
  readonly claim: string;
}

const claims: ReadonlyArray<Claim> = [
  {
    title: 'Worker-only signing',
    body: 'In our canonical execution pipeline, only the worker process holds Keeta signing material. The API, dashboard, MCP, and this website never see the seed.',
    evidence: 'apps/worker · packages/keeta/src/worker-bridge.ts · SECURITY.md',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 4',
  },
  {
    title: 'KMS-backed BYOK',
    body: 'Production-recommended: GCP Cloud KMS so the private key never leaves the HSM-backed boundary. Permissions stay scoped to a single key and a single service account.',
    evidence: 'packages/keeta/src/signer/gcp-kms-signer.ts · SECURITY.md',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 14',
  },
  {
    title: 'MCP rejects inline seeds',
    body: 'Default `MCP_ALLOW_INLINE_SEEDS=false`. Prompt-injected seed arguments throw at the tool boundary, not somewhere upstream. The flag is the explicit dev opt-in, not a recommended posture.',
    evidence: 'apps/mcp/src/tools/execute.ts · apps/mcp/src/tools/anchor-chaining.ts',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 5',
  },
  {
    title: 'Redacted logs',
    body: 'Pino redaction blocks seed-shaped fields and admin tokens by default. Operators can extend the deny list per environment.',
    evidence: 'packages/telemetry/src/logger.ts',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 6',
  },
  {
    title: 'Signed webhook delivery',
    body: 'Worker emits `x-keeta-signature: hmacSha256(secret, body)` per delivery. Per-subscription secrets live in Postgres only.',
    evidence: 'apps/worker/src/run.ts (webhook delivery)',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 12',
  },
  {
    title: 'Kill switch',
    body: 'Operators can stop live execution instantly via env or DB toggle. The worker re-checks before every job dequeue.',
    evidence: 'apps/worker/src/run.ts:killSwitchActive',
    claim: 'WEBSITE_SECURITY_CLAIMS.md row 13',
  },
  {
    title: 'RBAC at the API layer',
    body: 'Viewer / operator / admin enforced on every protected route. `ADMIN_BYPASS_TOKEN` disabled in production unless explicit opt-in.',
    evidence: 'apps/api/src/lib/auth.ts',
    claim: 'WEBSITE_SECURITY_CLAIMS.md rows 7, 8, 15, 16',
  },
  {
    title: 'No browser secrets',
    body: 'Dashboard CI lint blocks any `NEXT_PUBLIC_*KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` env name. The website extends the same posture.',
    evidence: 'apps/dashboard/scripts/lint-security.ts',
    claim: 'WEBSITE_SECURITY_CLAIMS.md rows 9, 10',
  },
];

const envBoundaries = [
  {
    side: 'Browser',
    description:
      'Public-only env: `NEXT_PUBLIC_*`. Never receives seeds, JWTs, OPS keys, KMS scopes.',
    accent: 'border-keeta/20',
  },
  {
    side: 'API service',
    description:
      'JWTs, RBAC, OpenAPI spec, audit hash chain. Holds DB credentials and webhook signer secrets — never the Keeta signing seed.',
    accent: 'border-white/10',
  },
  {
    side: 'Worker',
    description:
      'The only process that holds signing material. KMS-aware signer registry; ALLOW_DEV_SIGNER refused in production.',
    accent: 'border-keeta/40',
  },
  {
    side: 'MCP',
    description:
      'Tool surface for LLM agents. Inline seeds rejected by default. Signing-class tools delegate to the worker.',
    accent: 'border-white/10',
  },
];

const frontendNeverReceives = [
  'Keeta signing seeds. Ever.',
  'Operator API keys, JWTs, or session cookies bound to admin roles.',
  '`OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, or any privileged credential.',
  'KMS key resource names, GCP service-account credentials, or HSM scopes.',
  'Postgres connection strings, Redis URLs, or any infra secret.',
  'Webhook subscription HMAC secrets.',
  'Raw event-stream tokens issued for the operator dashboard SSE.',
];

const demoVsLive = {
  demo: {
    title: 'Demo mode (default)',
    items: [
      'Default for the public website. Set explicitly via `NEXT_PUBLIC_DEMO_MODE=true`.',
      'Renders deterministic fixtures from `packages/visualizer`.',
      'Zero network calls; zero data persistence in the browser.',
    ],
  },
  live: {
    title: 'Live mode (read-only preview)',
    items: [
      'Off unless `NEXT_PUBLIC_DEMO_MODE=false` and `NEXT_PUBLIC_KEETA_API_BASE_URL` is set.',
      'Calls one read-only public endpoint with a four-second timeout.',
      'On any failure, falls back to demo data and surfaces the data source.',
      'Never submits intents, executes, or hits admin routes.',
    ],
  },
};

const notSafe = [
  'No SOC 2 / ISO 27001 / PCI compliance badges — we have not been audited.',
  'No paid bug-bounty program. We credit reporters in the advisory and CHANGELOG.',
  'No claim that seeds never leave the MCP host — bootstrap tools currently emit raw seeds in tool transcripts.',
];

export default function SecurityPage() {
  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-10">
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Security</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold text-white md:text-6xl">
          Underclaim. Overprove. Cite the file.
        </h1>
        <p className="mt-5 max-w-2xl text-pretty text-base leading-7 text-zinc-300">
          Every claim on this page is grounded in a file in the repo. We don’t paraphrase guarantees
          we can’t enforce. The full posture lives in our public{' '}
          <Link
            href={siteConfig.securityUrl}
            className="text-keeta underline-offset-4 hover:underline"
          >
            SECURITY.md
          </Link>{' '}
          and{' '}
          <Link
            href={`${siteConfig.repoUrl}/blob/main/docs/web/WEBSITE_SECURITY_CLAIMS.md`}
            className="text-keeta underline-offset-4 hover:underline"
          >
            claim allowlist
          </Link>
          .
        </p>
      </section>

      <SecurityModelSection />

      <section id="boundaries" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Env boundaries
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Custody flows in one direction: browser → API → worker. Nothing crosses back the other
          way.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2 lg:grid-cols-4">
          {envBoundaries.map((boundary) => (
            <li
              key={boundary.side}
              className={`surface-card flex h-full flex-col p-5 ${boundary.accent}`}
            >
              <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                process
              </p>
              <p className="mt-2 text-base font-semibold text-white">{boundary.side}</p>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{boundary.description}</p>
            </li>
          ))}
        </ul>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-2xl font-semibold text-white">
          Eight things you can verify in five minutes
        </h2>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {claims.map((claim) => (
            <li key={claim.title} className="surface-card p-5">
              <h3 className="text-sm font-semibold text-white">{claim.title}</h3>
              <p className="mt-2 text-sm leading-6 text-zinc-400">{claim.body}</p>
              <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                {claim.evidence}
              </p>
              <p className="mt-1 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                claim · {claim.claim}
              </p>
            </li>
          ))}
        </ul>
      </section>

      <section id="demo-vs-live" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Demo mode vs live mode
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          The website is read-only by design. Live mode is a previewer, not a control surface.
        </p>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-keeta">
              {demoVsLive.demo.title}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {demoVsLive.demo.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-keeta" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
          <article className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-keeta">
              {demoVsLive.live.title}
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              {demoVsLive.live.items.map((item) => (
                <li key={item} className="flex gap-2">
                  <span aria-hidden className="mt-2 h-1 w-1 shrink-0 rounded-full bg-keeta" />
                  <span>{item}</span>
                </li>
              ))}
            </ul>
          </article>
        </div>
      </section>

      <section id="frontend" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          What the frontend never receives
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          The browser sees public copy and read-only previews. Everything below stays server-side
          and cannot be coerced into a `NEXT_PUBLIC_*` variable.
        </p>
        <ul className="mt-6 grid gap-3 md:grid-cols-2">
          {frontendNeverReceives.map((entry) => (
            <li
              key={entry}
              className="surface-card flex items-start gap-3 p-5 text-sm text-zinc-300"
            >
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
              <span>{entry}</span>
            </li>
          ))}
        </ul>
      </section>

      <section id="not-safe" className="mx-auto max-w-7xl px-5 py-16">
        <h2 className="text-2xl font-semibold text-white">Things we deliberately do not claim</h2>
        <ul className="mt-6 space-y-3">
          {notSafe.map((entry) => (
            <li
              key={entry}
              className="surface-card flex items-start gap-3 p-5 text-sm text-zinc-300"
            >
              <span aria-hidden className="mt-2 h-1.5 w-1.5 shrink-0 rounded-full bg-rose-300" />
              <span>{entry}</span>
            </li>
          ))}
        </ul>
      </section>

      <CTASection
        eyebrow="Coordinated disclosure"
        title="Report security issues privately."
        description="We acknowledge reports within three business days and follow standard coordinated disclosure with a default 90-day timeline."
        primary={{ label: 'Report a vulnerability', href: siteConfig.advisoriesUrl }}
        secondary={{ label: 'Read SECURITY.md', href: siteConfig.securityUrl }}
      />
    </>
  );
}
