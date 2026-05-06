import type { Metadata } from 'next';
import Link from 'next/link';
import { StatusPill } from '@keeta-agent-stack/ui';
import { LiveMetricsTicker, SettlementRailMap } from '@keeta-agent-stack/visualizer/client';
import { DemoPlaybackBoard } from '../../components/demo/DemoPlaybackBoard';
import { CTASection } from '../../components/site/CTASection';
import { getPublicApiSnapshot } from '../../lib/api-client';
import { buildMetadata } from '../../lib/seo';

export const metadata: Metadata = buildMetadata({
  path: '/demo',
  title: 'Demo',
  description:
    'Interactive demo of the full Keeta Agent Stack pipeline: playback controls, event log, policy result, route graph, simulation console, and execution timeline. Demo data only — no backend required.',
});

export default async function DemoPage() {
  const apiSnapshot = await getPublicApiSnapshot();

  return (
    <>
      <section className="mx-auto max-w-7xl px-5 pt-16 pb-6">
        <p className="text-xs font-semibold uppercase tracking-widest text-keeta">Demo</p>
        <h1 className="mt-3 max-w-3xl text-balance text-4xl font-semibold text-white md:text-6xl">
          Drive the whole pipeline.
        </h1>
        <p className="mt-5 max-w-3xl text-pretty text-base leading-7 text-zinc-300">
          Use the playback controls below to walk an intent through every stage — quote, route,
          policy, simulate, execute, audit. The visualizers stay in sync with the active stage.
          Nothing on this page calls a backend.
        </p>
        <div className="mt-6 flex flex-wrap items-center gap-3">
          <StatusPill status={apiSnapshot.mode === 'live' ? 'live' : 'demo'} pulse>
            mode ·{' '}
            {apiSnapshot.mode === 'live'
              ? 'live public probes'
              : apiSnapshot.mode === 'fallback'
                ? 'live fallback'
                : 'demo only'}
          </StatusPill>
          <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            pipeline · deterministic fixtures
          </span>
        </div>
        <div className="mt-8">
          <LiveMetricsTicker metrics={apiSnapshot.metrics} />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 pb-16">
        <DemoPlaybackBoard />
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Settlement rails
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Where the worker can settle today. Rail status reflects the canonical pipeline; rails
          marked <span className="text-zinc-300">paused</span> have no signers configured.
        </p>
        <div className="mt-6">
          <SettlementRailMap />
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <h2 className="text-xs font-semibold uppercase tracking-widest text-keeta">
          Public API probes
        </h2>
        <p className="mt-2 max-w-2xl text-base leading-7 text-zinc-400">
          Live mode only checks public, read-only endpoints. Every probe times out quickly and falls
          back to demo data without interrupting the page.
        </p>
        <div className="mt-6 grid gap-4 md:grid-cols-3">
          {apiSnapshot.probes.map((probe) => (
            <article key={probe.id} className="surface-card p-5">
              <div className="flex items-center justify-between gap-3">
                <div>
                  <h3 className="text-sm font-semibold text-white">{probe.label}</h3>
                  <p className="mt-1 font-mono text-xs text-zinc-500">{probe.path}</p>
                </div>
                <StatusPill
                  status={
                    probe.status === 'ok' ? 'live' : probe.status === 'skipped' ? 'demo' : 'paused'
                  }
                >
                  {probe.status}
                </StatusPill>
              </div>
              <p className="mt-4 text-sm leading-6 text-zinc-400">{probe.summary}</p>
              {probe.httpStatus ? (
                <p className="mt-3 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  http · {probe.httpStatus}
                </p>
              ) : null}
            </article>
          ))}
        </div>
      </section>

      <section className="mx-auto max-w-7xl px-5 py-12">
        <h2 className="text-2xl font-semibold text-white">What live mode does and does not do</h2>
        <div className="mt-6 grid gap-5 md:grid-cols-2">
          <article className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-keeta">Does</h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>Calls a single read-only public endpoint on the configured API base URL.</li>
              <li>Times out at four seconds and falls back to demo data on any failure.</li>
              <li>
                Surfaces the data source explicitly so operators can audit what they’re seeing.
              </li>
            </ul>
          </article>
          <article className="surface-card p-6">
            <h3 className="text-sm font-semibold uppercase tracking-widest text-rose-300">
              Does not
            </h3>
            <ul className="mt-3 space-y-2 text-sm text-zinc-300">
              <li>Submit intents, trigger execution, or call any admin route.</li>
              <li>
                Forward operator credentials, JWTs, or{' '}
                <span className="font-mono">OPS_API_KEY</span>.
              </li>
              <li>Persist anything to local storage, cookies, or third parties.</li>
            </ul>
          </article>
        </div>
        <p className="mt-4 text-xs text-zinc-500">
          See{' '}
          <Link href="/security#frontend" className="text-keeta hover:underline">
            /security
          </Link>{' '}
          for the full list of things the frontend deliberately never receives.
        </p>
      </section>

      <CTASection
        eyebrow="Want to drive it live?"
        title="Spin up the operator dashboard."
        description="The dashboard is the only surface where operators submit and approve intents. The website is read-only by design."
        primary={{ label: 'Open the dashboard', href: '/stack#dashboard' }}
        secondary={{ label: 'Read the docs', href: '/docs' }}
      />
    </>
  );
}
