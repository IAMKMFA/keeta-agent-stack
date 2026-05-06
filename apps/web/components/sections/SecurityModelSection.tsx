import Link from 'next/link';
import { AlertTriangle, Bell, KeyRound, PowerOff, ScrollText, ShieldCheck } from 'lucide-react';
import { Reveal } from '../motion/Reveal';
import { Stagger, StaggerItem } from '../motion/Stagger';
import { siteConfig } from '../../lib/site-config';

/**
 * Each claim below corresponds to a row in
 * `docs/web/WEBSITE_SECURITY_CLAIMS.md`. The wording mirrors the
 * "underclaim, overprove" template — qualifier language is
 * preserved, no compliance badges, no fabricated audits.
 */
const claims = [
  {
    icon: KeyRound,
    title: 'Worker-only signing, by design',
    summary:
      'In the canonical execution pipeline, only the worker process holds Keeta signing material. The API, dashboard, MCP, and this website never see the seed.',
    evidence: 'apps/worker · packages/keeta/src/worker-bridge.ts',
  },
  {
    icon: ShieldCheck,
    title: 'BYOK via Cloud KMS',
    summary:
      'Production-recommended path is GCP Cloud KMS so the private key never leaves the HSM-backed boundary. Permissions stay scoped to a single key and a single service account.',
    evidence: 'packages/keeta/src/signer/gcp-kms-signer.ts · SECURITY.md',
  },
  {
    icon: AlertTriangle,
    title: 'Inline seeds rejected by default',
    summary:
      'The MCP server refuses inline seed arguments unless the operator explicitly opts in. Prompt-injected seeds never reach the worker.',
    evidence: 'apps/mcp/src/tools/execute.ts',
  },
  {
    icon: ScrollText,
    title: 'Policy gates live execution',
    summary:
      'Named policy packs evaluate every intent before any signing material is touched. Decisions and matched rules are persisted to a durable audit trail with no operator-side delete.',
    evidence: 'packages/policy · apps/api · /audits',
  },
  {
    icon: PowerOff,
    title: 'Kill switch and dev-signer guard',
    summary:
      'Operators can stop live execution instantly via the kill switch. The worker re-checks before every job and refuses to boot in production with `ALLOW_DEV_SIGNER=true`.',
    evidence: 'apps/worker/src/run.ts · packages/config/src/index.ts',
  },
  {
    icon: Bell,
    title: 'Signed webhooks and redacted logs',
    summary:
      "Webhook deliveries are HMAC-signed with a per-subscription secret stored server-side. Seed-shaped fields are redacted from logs by default through Pino's deny-list.",
    evidence: 'apps/worker/src/run.ts · packages/telemetry/src/logger.ts',
  },
];

export function SecurityModelSection() {
  return (
    <section id="security" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Security model</p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Underclaim, overprove.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Every claim on this page maps to repo evidence. Read the full posture in our public{' '}
          <Link
            href={siteConfig.securityUrl}
            className="text-keeta underline-offset-4 hover:underline"
          >
            SECURITY.md
          </Link>
          .
        </p>
      </Reveal>

      <Stagger className="mt-10 grid gap-5 md:grid-cols-2 lg:grid-cols-3">
        {claims.map((claim) => {
          const Icon = claim.icon;
          return (
            <StaggerItem key={claim.title}>
              <article className="surface-card surface-card-hover flex h-full flex-col p-6">
                <Icon className="h-5 w-5 text-keeta" aria-hidden />
                <h3 className="mt-4 text-lg font-semibold text-white">{claim.title}</h3>
                <p className="mt-2 text-sm leading-6 text-zinc-400">{claim.summary}</p>
                <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {claim.evidence}
                </p>
              </article>
            </StaggerItem>
          );
        })}
      </Stagger>
    </section>
  );
}
