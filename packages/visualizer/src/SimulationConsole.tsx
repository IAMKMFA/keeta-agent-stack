import { motion } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import { DEMO_SIMULATION, type DemoSimulationLine } from './data/demo-pipeline.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface SimulationConsoleProps {
  readonly className?: string;
  readonly lines?: ReadonlyArray<DemoSimulationLine>;
  readonly title?: string;
  readonly status?: 'passed' | 'failed';
}

/**
 * Terminal-style readout of the simulator's account-delta lines. Lines
 * fade in sequentially when motion is allowed; collapse to a static
 * list otherwise.
 */
export function SimulationConsole({
  className,
  lines = DEMO_SIMULATION,
  title = 'simulator · pre-execute',
  status = 'passed',
}: SimulationConsoleProps) {
  const reduced = useReducedMotionSafe();
  return (
    <figure
      className={cn(
        'overflow-hidden rounded-lg border border-white/10 bg-panel/85 text-left shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_rgba(0,0,0,0.45)]',
        className
      )}
    >
      <div className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <div className="flex items-center gap-1.5">
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-rose-400/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-amber-300/60" />
          <span aria-hidden className="h-2.5 w-2.5 rounded-full bg-keeta/70" />
        </div>
        <div className="flex items-center gap-3 font-mono text-xs uppercase tracking-widest text-zinc-500">
          <span>{title}</span>
          <span className={status === 'passed' ? 'text-keeta' : 'text-rose-300'}>{status}</span>
        </div>
      </div>
      <div className="px-5 py-4 font-mono text-[12.5px] leading-6 text-zinc-200">
        <p className="text-zinc-500">$ keeta simulate intent_4f1e9c</p>
        <ul className="mt-2 space-y-1">
          {lines.map((line, index) => {
            const positive = line.delta.startsWith('+');
            return (
              <motion.li
                key={`${line.account}-${line.delta}`}
                initial={{ opacity: 0, y: reduced ? 0 : 4 }}
                animate={{ opacity: 1, y: 0 }}
                transition={{
                  delay: reduced ? 0 : index * 0.16,
                  duration: reduced ? 0 : 0.32,
                  ease: [0.22, 1, 0.36, 1],
                }}
                className="grid grid-cols-[1.4fr_0.7fr_1fr] gap-3"
              >
                <span className="text-zinc-300">{line.account}</span>
                <span className={positive ? 'text-keeta' : 'text-rose-300'}>{line.delta}</span>
                <span className="text-zinc-500">{line.balanceAfter}</span>
              </motion.li>
            );
          })}
        </ul>
        <p className="mt-3 text-xs text-zinc-500">
          {status === 'passed'
            ? 'Simulator passed. Execution will commit the deltas above.'
            : 'Simulator failed. Worker will not be invoked.'}
        </p>
      </div>
    </figure>
  );
}
