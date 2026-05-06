import { m } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import { DEMO_RAILS, type DemoSettlementRail } from './data/demo-pipeline.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface SettlementRailMapProps {
  readonly className?: string;
  readonly rails?: ReadonlyArray<DemoSettlementRail>;
}

const statusTone: Record<DemoSettlementRail['status'], string> = {
  live: 'text-keeta',
  demo: 'text-cyanline',
  paused: 'text-zinc-400',
};

const statusDot: Record<DemoSettlementRail['status'], string> = {
  live: 'bg-keeta',
  demo: 'bg-cyanline',
  paused: 'bg-zinc-500',
};

/**
 * Grid of settlement rails with a status dot, latency, and a short
 * description. Live rails pulse subtly; demo and paused rails do not.
 */
export function SettlementRailMap({ className, rails = DEMO_RAILS }: SettlementRailMapProps) {
  const reduced = useReducedMotionSafe();
  return (
    <ul
      className={cn(
        'grid gap-3 rounded-lg border border-white/10 bg-panel/60 p-5 sm:grid-cols-2 lg:grid-cols-3',
        className
      )}
    >
      {rails.map((rail) => (
        <m.li
          key={rail.id}
          initial={false}
          animate={{ opacity: rail.status === 'paused' ? 0.65 : 1 }}
          transition={{ duration: reduced ? 0 : 0.3 }}
          className="flex flex-col rounded-md border border-white/10 bg-graphite/40 p-3"
        >
          <div className="flex items-center justify-between">
            <span className="text-sm font-semibold text-white">{rail.label}</span>
            <span className="relative inline-flex h-2.5 w-2.5">
              <span
                className={cn(
                  'absolute inline-flex h-full w-full rounded-full',
                  statusDot[rail.status]
                )}
              />
              {!reduced && rail.status === 'live' ? (
                <span
                  aria-hidden
                  className={cn(
                    'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
                    statusDot[rail.status]
                  )}
                />
              ) : null}
            </span>
          </div>
          <p className="mt-1 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            {rail.chain}
          </p>
          <p className="mt-2 text-xs leading-5 text-zinc-400">{rail.description}</p>
          <div className="mt-3 flex items-center justify-between text-[11px]">
            <span className={cn('font-mono uppercase tracking-widest', statusTone[rail.status])}>
              {rail.status}
            </span>
            <span className="font-mono text-zinc-500">
              {rail.latencyMs > 0 ? `${rail.latencyMs} ms` : '—'}
            </span>
          </div>
        </m.li>
      ))}
    </ul>
  );
}
