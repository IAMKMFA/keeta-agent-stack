import { motion } from 'framer-motion';
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
  return (
    <div
      className={cn(
        'grid gap-4 rounded-lg border border-white/10 bg-panel/60 p-5 lg:grid-cols-[0.7fr_1.3fr]',
        className
      )}
    >
      <div className="flex flex-col">
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">policy</p>
        <motion.div
          initial={{ opacity: 0, scale: 0.96 }}
          animate={{ opacity: 1, scale: 1 }}
          transition={{ duration: reduced ? 0 : 0.45, ease: [0.22, 1, 0.36, 1] }}
          className={cn(
            'mt-3 flex flex-1 flex-col items-start justify-between rounded-md border bg-graphite/40 p-4',
            decisionTone[decision]
          )}
        >
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
        </motion.div>
      </div>

      <div>
        <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">checks</p>
        <ul className="mt-3 space-y-2">
          {checks.map((check, index) => (
            <motion.li
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
            </motion.li>
          ))}
        </ul>
      </div>
    </div>
  );
}
