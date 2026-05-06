'use client';

import Link from 'next/link';
import { useState } from 'react';
import { StatusPill } from '@keeta-agent-stack/ui';
import {
  ExecutionTimeline,
  PolicyGate,
  SimulationConsole,
} from '@keeta-agent-stack/visualizer/client';
import type { PipelineSnapshot } from '../../lib/api-client';
import { cn } from '../../lib/cn';
import { DemoEventLog } from './DemoEventLog';

type Mode = 'simulation' | 'live';

interface DemoModeBoardProps {
  readonly snapshot: PipelineSnapshot;
  readonly liveModeEnabled: boolean;
}

const decisionStyles: Record<'allow' | 'deny' | 'simulate-only', string> = {
  allow: 'text-keeta',
  deny: 'text-rose-300',
  'simulate-only': 'text-amber-300',
};

const settlementStyles: Record<'submitted' | 'confirmed' | 'failed' | 'unknown', string> = {
  submitted: 'text-amber-300',
  confirmed: 'text-keeta',
  failed: 'text-rose-300',
  unknown: 'text-zinc-400',
};

/**
 * Client-side board for the homepage interactive demo. Manages the
 * Simulation / Live Mode Preview toggle. Live Mode Preview is
 * **visual only** — it surfaces the snapshot the server fetched (or
 * fell back from) but never makes its own network calls. The actual
 * live fetch happens in `lib/api-client.ts` and is gated by
 * `NEXT_PUBLIC_DEMO_MODE=false` plus a configured base URL.
 */
export function DemoModeBoard({ snapshot, liveModeEnabled }: DemoModeBoardProps) {
  const [mode, setMode] = useState<Mode>('simulation');

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-panel/60 p-3">
        <div
          role="tablist"
          aria-label="Demo mode"
          className="flex gap-1 rounded-md border border-white/10 bg-graphite/40 p-1"
        >
          <ModeButton
            isActive={mode === 'simulation'}
            onClick={() => setMode('simulation')}
            label="Simulation Mode"
            sublabel="No backend"
          />
          <ModeButton
            isActive={mode === 'live'}
            onClick={() => setMode('live')}
            label="Live Mode Preview"
            sublabel={liveModeEnabled ? 'Read-only API' : 'Visual only'}
          />
        </div>
        <div className="flex items-center gap-3">
          <StatusPill
            status={mode === 'live' && liveModeEnabled ? 'live' : 'demo'}
            pulse={mode === 'live'}
          >
            mode ·{' '}
            {mode === 'live' ? (liveModeEnabled ? 'live · read-only' : 'preview') : 'simulation'}
          </StatusPill>
          <span className="hidden font-mono text-[11px] uppercase tracking-widest text-zinc-500 sm:inline">
            pipeline · {snapshot.source} · api · {snapshot.api.mode}
          </span>
        </div>
      </div>

      {mode === 'simulation' ? (
        <SimulationView />
      ) : (
        <LiveView snapshot={snapshot} liveModeEnabled={liveModeEnabled} />
      )}
    </div>
  );
}

function ModeButton({
  isActive,
  onClick,
  label,
  sublabel,
}: {
  readonly isActive: boolean;
  readonly onClick: () => void;
  readonly label: string;
  readonly sublabel: string;
}) {
  return (
    <button
      type="button"
      role="tab"
      aria-selected={isActive}
      onClick={onClick}
      className={cn(
        'rounded px-3 py-1.5 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60',
        isActive ? 'bg-white/10 text-white' : 'text-zinc-300 hover:bg-white/5 hover:text-white'
      )}
    >
      <span className="font-medium">{label}</span>
      <span className="ml-2 font-mono text-[10px] uppercase tracking-widest text-zinc-500">
        {sublabel}
      </span>
    </button>
  );
}

function SimulationView() {
  return (
    <>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <PolicyGate />
        <SimulationConsole />
      </div>
      <div className="mt-5 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <ExecutionTimeline />
        <DemoEventLog />
      </div>
    </>
  );
}

function LiveView({
  snapshot,
  liveModeEnabled,
}: {
  readonly snapshot: PipelineSnapshot;
  readonly liveModeEnabled: boolean;
}) {
  return (
    <div className="mt-5 space-y-5">
      <div className="rounded-lg border border-white/10 bg-panel/60 p-4 text-xs leading-6 text-zinc-300">
        {liveModeEnabled ? (
          <p>
            Live mode is enabled. The page has checked safe public endpoints and reported{' '}
            <span className="text-keeta">{snapshot.api.mode}</span> API status, while the pipeline
            cards below remain deterministic fixtures.
          </p>
        ) : (
          <p>
            Live mode is <span className="font-mono text-amber-300">off</span>. To preview live
            data, an operator sets <span className="font-mono">NEXT_PUBLIC_DEMO_MODE=false</span>{' '}
            and provides a <span className="font-mono">NEXT_PUBLIC_KEETA_API_BASE_URL</span>. Until
            then, the page never calls a backend.
          </p>
        )}
      </div>
      <div className="grid gap-3 lg:grid-cols-3">
        {snapshot.api.probes.map((probe) => (
          <div key={probe.id} className="rounded-lg border border-white/10 bg-panel/40 p-3">
            <div className="flex items-center justify-between gap-3">
              <span className="text-xs font-semibold uppercase tracking-widest text-zinc-400">
                {probe.label}
              </span>
              <span
                className={
                  probe.status === 'ok'
                    ? 'text-xs text-keeta'
                    : probe.status === 'skipped'
                      ? 'text-xs text-zinc-500'
                      : 'text-xs text-amber-300'
                }
              >
                {probe.status}
              </span>
            </div>
            <p className="mt-2 line-clamp-2 text-xs leading-5 text-zinc-500">{probe.summary}</p>
          </div>
        ))}
      </div>
      <div className="grid gap-5 lg:grid-cols-3">
        {snapshot.rows.map((row) => (
          <article key={row.intent.id} className="surface-card flex h-full flex-col p-6">
            <header>
              <p className="text-xs uppercase text-zinc-500">{row.intent.label}</p>
              <p className="mt-2 text-sm text-zinc-300">{row.intent.purpose}</p>
            </header>
            <dl className="mt-5 grid grid-cols-2 gap-x-4 gap-y-3 text-xs">
              <div>
                <dt className="text-zinc-500">From</dt>
                <dd className="font-mono text-zinc-200">
                  {row.intent.source.amount} {row.intent.source.asset}
                  <span className="text-zinc-500"> · {row.intent.source.chain}</span>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">To</dt>
                <dd className="font-mono text-zinc-200">
                  {row.intent.destination.amount} {row.intent.destination.asset}
                  <span className="text-zinc-500"> · {row.intent.destination.chain}</span>
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Quote slippage</dt>
                <dd className="font-mono text-zinc-200">{row.quote.slippageBps} bps</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Route fee</dt>
                <dd className="font-mono text-zinc-200">{row.route.estimatedFeeBps} bps</dd>
              </div>
              <div>
                <dt className="text-zinc-500">Policy</dt>
                <dd className={`font-mono ${decisionStyles[row.policy.decision]}`}>
                  {row.policy.decision}
                </dd>
              </div>
              <div>
                <dt className="text-zinc-500">Settlement</dt>
                <dd className={`font-mono ${settlementStyles[row.receipt.settlementState]}`}>
                  {row.receipt.settlementState}
                </dd>
              </div>
            </dl>
            <ul className="mt-5 space-y-1.5 text-xs text-zinc-400">
              {row.policy.checks.map((check) => (
                <li key={check.id} className="flex items-center justify-between gap-3">
                  <span>{check.summary}</span>
                  <span
                    className={
                      check.outcome === 'pass'
                        ? 'text-keeta'
                        : check.outcome === 'warn'
                          ? 'text-amber-300'
                          : 'text-rose-300'
                    }
                  >
                    {check.outcome}
                  </span>
                </li>
              ))}
            </ul>
            <p className="mt-5 text-xs text-zinc-500">{row.simulation.notes}</p>
          </article>
        ))}
      </div>
      <div className="flex justify-end">
        <Link
          href="/demo"
          className="rounded-md border border-white/10 px-4 py-2 text-sm text-zinc-100 hover:border-keeta/40"
        >
          Open the full demo →
        </Link>
      </div>
    </div>
  );
}
