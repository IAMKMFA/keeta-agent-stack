import Link from 'next/link';
import { homeQuickstartSnippets } from '../../content/code-snippets';
import { siteConfig } from '../../lib/site-config';
import { CodeTerminal } from '../visual/CodeTerminal';
import { Reveal } from '../motion/Reveal';

const repoCommandList: ReadonlyArray<{ readonly cmd: string; readonly note: string }> = [
  { cmd: 'pnpm install', note: 'Install all workspace dependencies' },
  { cmd: 'docker compose up -d', note: 'Postgres + Redis (only runtime infra needed)' },
  { cmd: 'pnpm db:migrate', note: '`packages/storage` Drizzle migrations' },
  { cmd: 'pnpm dev:all', note: 'Run api + worker + dashboard + mcp via Turbo' },
  { cmd: 'pnpm demo', note: 'Deterministic end-to-end demo (`scripts/demo.sh`)' },
];

export function DeveloperQuickstart() {
  return (
    <section id="quickstart" className="mx-auto max-w-7xl px-5 py-20">
      <Reveal>
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Developer quickstart
        </p>
        <h2 className="mt-3 max-w-3xl text-balance text-3xl font-semibold text-white md:text-4xl">
          Five commands. One repo. The whole pipeline.
        </h2>
        <p className="mt-4 max-w-2xl text-pretty text-base leading-7 text-zinc-400">
          Clone, install, bring up Postgres and Redis, run the migrations, and start the API,
          worker, dashboard, and MCP together. Live execution is one env flag away once you
          provision a worker signer.
        </p>
      </Reveal>

      <div className="mt-10 grid gap-6 lg:grid-cols-[1.1fr_0.9fr]">
        <div className="space-y-4">
          {homeQuickstartSnippets.map((snippet) => (
            <CodeTerminal key={snippet.id} snippet={snippet} />
          ))}
        </div>
        <div className="space-y-5">
          <aside className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-300">
              The canonical command list
            </h3>
            <ol className="mt-4 space-y-2.5 text-sm">
              {repoCommandList.map((item, index) => (
                <li key={item.cmd} className="flex items-start gap-3">
                  <span className="mt-0.5 inline-flex h-5 w-5 shrink-0 items-center justify-center rounded-full border border-keeta/30 text-[11px] font-mono text-keeta">
                    {index + 1}
                  </span>
                  <div>
                    <code className="font-mono text-zinc-100">{item.cmd}</code>
                    <p className="mt-0.5 text-xs text-zinc-500">{item.note}</p>
                  </div>
                </li>
              ))}
            </ol>
          </aside>
          <aside className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-zinc-300">
              What ships in the repo
            </h3>
            <ul className="mt-4 space-y-3 text-sm text-zinc-300">
              <li>
                <span className="font-mono text-keeta">apps/api</span> — Fastify control plane,
                OpenAPI snapshot, Swagger UI at{' '}
                <span className="font-mono">{siteConfig.openApiLocalUrl}</span>.
              </li>
              <li>
                <span className="font-mono text-keeta">apps/worker</span> — the canonical signer.
                Reconciliation, kill switch, KMS-ready.
              </li>
              <li>
                <span className="font-mono text-keeta">apps/dashboard</span> — operator console with
                role-based access and live SSE.
              </li>
              <li>
                <span className="font-mono text-keeta">apps/mcp</span> — 40+ tools so an LLM can
                author intents under policy.
              </li>
              <li>
                <span className="font-mono text-keeta">packages/sdk</span> — typed REST client used
                by the website itself.
              </li>
            </ul>
            <div className="mt-6 flex flex-wrap gap-2">
              <Link
                href={siteConfig.repoUrl}
                className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-100 hover:border-keeta/40"
              >
                GitHub
              </Link>
              <Link
                href="/developers"
                className="rounded-md bg-keeta px-4 py-2 text-sm font-semibold text-black"
              >
                Full quickstart
              </Link>
            </div>
          </aside>
        </div>
      </div>
    </section>
  );
}
