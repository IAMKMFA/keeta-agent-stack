import { motion } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import {
  DEMO_AUDIT,
  DEMO_EXECUTION,
  type DemoAuditEvent,
  type DemoExecutionStep,
} from './data/demo-pipeline.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface ExecutionTimelineProps {
  readonly className?: string;
  readonly steps?: ReadonlyArray<DemoExecutionStep>;
  readonly audit?: DemoAuditEvent;
}

const statusTone: Record<DemoExecutionStep['status'], string> = {
  pending: 'text-zinc-500',
  submitted: 'text-amber-300',
  confirmed: 'text-keeta',
};

const statusGlyph: Record<DemoExecutionStep['status'], string> = {
  pending: '◌',
  submitted: '◐',
  confirmed: '●',
};

export function ExecutionTimeline({
  className,
  steps = DEMO_EXECUTION,
  audit = DEMO_AUDIT,
}: ExecutionTimelineProps) {
  const reduced = useReducedMotionSafe();
  return (
    <div className={cn('rounded-lg border border-white/10 bg-panel/60 p-5', className)}>
      <p className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
        execution + audit
      </p>
      <ol className="mt-4 space-y-4">
        {steps.map((step, index) => (
          <motion.li
            key={step.id}
            initial={{ opacity: 0, x: reduced ? 0 : -6 }}
            animate={{ opacity: 1, x: 0 }}
            transition={{
              delay: reduced ? 0 : index * 0.12,
              duration: reduced ? 0 : 0.32,
              ease: [0.22, 1, 0.36, 1],
            }}
            className="grid grid-cols-[auto_1fr_auto] items-start gap-4"
          >
            <span aria-hidden className={cn('mt-0.5 font-mono text-base', statusTone[step.status])}>
              {statusGlyph[step.status]}
            </span>
            <div>
              <p className="text-sm font-semibold text-white">{step.label}</p>
              <p className="mt-0.5 text-xs text-zinc-400">{step.detail}</p>
              {step.txHash ? (
                <p className="mt-1 font-mono text-[11px] text-zinc-500">tx · {step.txHash}</p>
              ) : null}
            </div>
            <span
              className={cn(
                'font-mono text-[10px] uppercase tracking-widest',
                statusTone[step.status]
              )}
            >
              {step.status}
            </span>
          </motion.li>
        ))}
      </ol>
      <div className="mt-5 grid gap-2 rounded-md border border-keeta/30 bg-keeta/5 p-3 text-xs">
        <div className="flex items-center justify-between">
          <span className="font-mono text-[11px] uppercase tracking-widest text-keeta">
            audit emitted
          </span>
          <span className="font-mono text-[11px] text-zinc-500">{audit.id}</span>
        </div>
        <div className="grid grid-cols-2 gap-2 text-zinc-300">
          <div>
            <p className="text-[11px] text-zinc-500">receipt</p>
            <p className="font-mono">{audit.receiptId}</p>
          </div>
          <div>
            <p className="text-[11px] text-zinc-500">audit hash</p>
            <p className="font-mono">{audit.auditHash}</p>
          </div>
        </div>
        <p className="font-mono text-[10px] text-zinc-500">emitted at {audit.emittedAtIso}</p>
      </div>
    </div>
  );
}
