import { motion } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import {
  DEMO_QUOTES,
  DEMO_ROUTE,
  type DemoQuote,
  type DemoRouteHop,
} from './data/demo-pipeline.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface RouteGraphProps {
  readonly className?: string;
  readonly hops?: ReadonlyArray<DemoRouteHop>;
  readonly quotes?: ReadonlyArray<DemoQuote>;
}

/**
 * Side-by-side: the candidate quotes (left) and the selected route
 * graph (right). The chosen quote is connected to the route diagram
 * with a glowing wire so the eye follows the decision.
 */
export function RouteGraph({
  className,
  hops = DEMO_ROUTE,
  quotes = DEMO_QUOTES,
}: RouteGraphProps) {
  const reduced = useReducedMotionSafe();

  return (
    <div
      className={cn(
        'grid gap-4 rounded-lg border border-white/10 bg-panel/60 p-5 lg:grid-cols-[0.9fr_1.1fr]',
        className
      )}
    >
      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">quotes</p>
        <ul className="mt-3 space-y-2">
          {quotes.map((quote) => (
            <motion.li
              key={quote.venue}
              initial={false}
              animate={{
                opacity: quote.chosen ? 1 : 0.55,
                borderColor: quote.chosen ? 'rgba(68,241,166,0.6)' : 'rgba(255,255,255,0.08)',
              }}
              transition={{ duration: reduced ? 0 : 0.4 }}
              className="flex items-center justify-between gap-3 rounded-md border bg-graphite/40 px-3 py-2"
            >
              <div>
                <p className="font-mono text-xs text-zinc-200">{quote.venue}</p>
                <p className="text-[11px] text-zinc-500">
                  fee {quote.feeBps} bps · ~{quote.latencyMs}ms
                </p>
              </div>
              <div className="text-right">
                <p className="font-mono text-sm text-zinc-100">{quote.outDisplay}</p>
                {quote.chosen ? (
                  <p className="font-mono text-[10px] uppercase tracking-widest text-keeta">
                    chosen
                  </p>
                ) : null}
              </div>
            </motion.li>
          ))}
        </ul>
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">route</p>
        <svg
          role="img"
          aria-label="Selected route hops"
          viewBox="0 0 480 160"
          className="mt-3 w-full text-keeta"
        >
          <defs>
            <linearGradient id="route-wire" x1="0" y1="0" x2="1" y2="0">
              <stop offset="0%" stopColor="currentColor" stopOpacity="0.1" />
              <stop offset="50%" stopColor="currentColor" stopOpacity="0.7" />
              <stop offset="100%" stopColor="currentColor" stopOpacity="0.1" />
            </linearGradient>
          </defs>
          {hops.map((hop, index) => {
            if (index === hops.length - 1) return null;
            const x1 = 60 + (360 / Math.max(hops.length - 1, 1)) * index;
            const x2 = 60 + (360 / Math.max(hops.length - 1, 1)) * (index + 1);
            return (
              <g key={`wire-${hop.id}`}>
                <line x1={x1} y1={80} x2={x2} y2={80} stroke="url(#route-wire)" strokeWidth={2} />
                {!reduced && (
                  <motion.circle
                    cx={x1}
                    cy={80}
                    r={3.5}
                    fill="currentColor"
                    initial={{ cx: x1, opacity: 0 }}
                    animate={{ cx: [x1, x2], opacity: [0, 1, 0] }}
                    transition={{
                      duration: 1.6,
                      delay: index * 0.5,
                      repeat: Infinity,
                      repeatDelay: 1.0,
                    }}
                  />
                )}
              </g>
            );
          })}
          {hops.map((hop, index) => {
            const cx = 60 + (360 / Math.max(hops.length - 1, 1)) * index;
            return (
              <g key={hop.id}>
                <circle cx={cx} cy={80} r={20} fill="currentColor" fillOpacity={0.08} />
                <circle cx={cx} cy={80} r={8} fill="currentColor" fillOpacity={0.85} />
                <text
                  x={cx}
                  y={120}
                  textAnchor="middle"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={11}
                  fill="currentColor"
                  fillOpacity={0.7}
                >
                  {hop.label}
                </text>
                <text
                  x={cx}
                  y={138}
                  textAnchor="middle"
                  fontFamily="ui-monospace, SFMono-Regular, Menlo, monospace"
                  fontSize={9}
                  fill="currentColor"
                  fillOpacity={0.4}
                >
                  {hop.venue}
                </text>
              </g>
            );
          })}
        </svg>
      </div>
    </div>
  );
}
