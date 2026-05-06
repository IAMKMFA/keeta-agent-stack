import { m } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import { DEMO_POLICY, type DemoPolicyCheck } from './data/demo-pipeline.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface PolicyGateProps {
  readonly className?: string;
  readonly decision?: 'allow' | 'review' | 'deny';
  readonly pack?: string;
  readonly checks?: ReadonlyArray<DemoPolicyCheck>;
}

const decisionTone: Record<NonNullable<PolicyGateProps['decision']>, string> = {
  allow: 'border-keeta/50 text-keeta',
  review: 'border-amber-300/40 text-amber-300',
  deny: 'border-rose-300/40 text-rose-300',
};

const checkTone: Record<DemoPolicyCheck['outcome'], string> = {
  pass: 'text-keeta',
  warn: 'text-amber-300',
  fail: 'text-rose-300',
};

/**
 * Policy decision visualization. Two columns:
 *   - Left: a "gate" badge with the decision and the policy pack.
 *   - Right: an animated checks list (each row reveals in sequence).
 */
export function PolicyGate({
  className,
  decision = DEMO_POLICY.decision,
  pack = DEMO_POLICY.pack,
  checks = DEMO_POLICY.checks,
}: PolicyGateProps) {
  const reduced = useReducedMotionSafe();
  const completedChecks = checks.filter((check) => check.outcome !== 'fail').length;
  const completion = checks.length === 0 ? 0 : (completedChecks / checks.length) * 100;

  return (
    <div
      className={cn(
        'grid gap-4 overflow-hidden rounded-lg border border-white/10 bg-panel/60 p-5 lg:grid-cols-[0.7fr_1.3fr]',
        className
      )}
    >
      <div className="flex flex-col">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">policy</p>
        <m.div
          key={decision}
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'relative mt-3 flex flex-1 flex-col items-start justify-between overflow-hidden rounded-md border bg-graphite/40 p-4',
            decisionTone[decision]
          )}
        >
          {!reduced ? (
            <m.span
              aria-hidden
              className="absolute inset-0 bg-[radial-gradient(circle_at_30%_0%,rgba(68,241,166,0.16),transparent_42%)]"
              animate={{ opacity: [0.35, 0.75, 0.35] }}
              transition={{ duration: 2.4, repeat: Infinity, ease: 'easeInOut' }}
            />
          ) : null}
          <div>
            <p className="font-mono text-[11px] uppercase tracking-widest opacity-70">decision</p>
            <p className="mt-1 text-2xl font-semibold uppercase tracking-tightish">{decision}</p>
          </div>
          <div className="mt-4">
            <p className="font-mono text-[11px] uppercase tracking-widest opacity-70">
              policy pack
            </p>
            <p className="font-mono text-sm">{pack}</p>
          </div>
        </m.div>
      </div>

      <div>
        <div className="flex items-center justify-between gap-4">
          <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">checks</p>
          <p className="font-mono text-[10px] uppercase tracking-widest text-zinc-500">
            gate · {Math.round(completion)}%
          </p>
        </div>
        <div className="mt-3 h-1 overflow-hidden rounded-full bg-white/8">
          <m.div
            className="h-full rounded-full bg-gradient-to-r from-keeta/70 to-cyanline/70"
            initial={false}
            animate={{ width: `${completion}%` }}
            transition={{ duration: reduced ? 0 : 0.5, ease: [0.22, 1, 0.36, 1] }}
          />
        </div>
        <ul className="mt-3 space-y-2">
          {checks.map((check, index) => (
            <m.li
              key={check.id}
              initial={{ opacity: 0, x: reduced ? 0 : -8 }}
              animate={{ opacity: 1, x: 0 }}
              transition={{
                delay: reduced ? 0 : index * 0.08,
                duration: reduced ? 0 : 0.32,
                ease: [0.22, 1, 0.36, 1],
              }}
              className="flex items-center justify-between gap-3 rounded-md border border-white/10 bg-graphite/40 px-3 py-2"
            >
              <span className="text-sm text-zinc-200">{check.summary}</span>
              <span className={cn('font-mono text-xs uppercase', checkTone[check.outcome])}>
                {check.outcome}
              </span>
            </m.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
