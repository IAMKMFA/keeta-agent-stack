import { motion } from 'framer-motion';
import { cn } from '@keeta-agent-stack/ui';
import {
  PIPELINE_STAGES,
  type PipelineStageId,
  type PipelineStageMeta,
} from './data/demo-pipeline.js';
import { usePipelineDemo } from './hooks/usePipelineDemo.js';
import { useReducedMotionSafe } from './hooks/useReducedMotionSafe.js';

interface IntentPipelineProps {
  readonly className?: string;
  readonly stages?: ReadonlyArray<PipelineStageMeta>;
  /** Force a stage as active. Disables the demo loop. */
  readonly activeId?: PipelineStageId;
  /** Restart the demo loop on completion. Default true. */
  readonly loop?: boolean;
}

/**
 * Horizontal pipeline visualization. The seven stages render as nodes
 * connected by a single rail; an active marker travels along the rail
 * driven by `usePipelineDemo` (or by the `activeId` prop when the
 * caller wants to drive it themselves).
 */
export function IntentPipeline({
  className,
  stages = PIPELINE_STAGES,
  activeId,
  loop = true,
}: IntentPipelineProps) {
  const reduced = useReducedMotionSafe();
  const demo = usePipelineDemo({ autoStart: !activeId, loop });

  const activeIndex = activeId
    ? stages.findIndex((stage) => stage.id === activeId)
    : demo.activeIndex;
  const safeIndex = activeIndex < 0 ? 0 : activeIndex;

  const completion = stages.length <= 1 ? 1 : safeIndex / (stages.length - 1);

  return (
    <div
      className={cn('relative w-full', className)}
      role="img"
      aria-label={`Execution pipeline. Active stage: ${stages[safeIndex]?.label ?? 'unknown'}.`}
    >
      <div className="relative h-1 w-full overflow-hidden rounded-full bg-white/8">
        <motion.div
          className="h-full rounded-full bg-keeta/60"
          initial={false}
          animate={{ width: `${completion * 100}%` }}
          transition={{ duration: reduced ? 0 : 0.6, ease: [0.22, 1, 0.36, 1] }}
        />
      </div>
      <ol className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-7">
        {stages.map((stage, index) => {
          const isActive = index === safeIndex;
          const isDone = index < safeIndex;
          return (
            <li
              key={stage.id}
              className={cn(
                'rounded-md border bg-panel/60 p-4 transition-colors',
                isActive ? 'border-keeta/60' : isDone ? 'border-keeta/20' : 'border-white/10'
              )}
              aria-current={isActive ? 'step' : undefined}
            >
              <div className="flex items-center justify-between">
                <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
                  {(index + 1).toString().padStart(2, '0')}
                </span>
                <span
                  aria-hidden
                  className={cn(
                    'h-2 w-2 rounded-full transition-colors',
                    isActive
                      ? 'bg-keeta shadow-[0_0_18px_rgba(68,241,166,0.7)]'
                      : isDone
                        ? 'bg-keeta/60'
                        : 'bg-white/20'
                  )}
                />
              </div>
              <p className="mt-3 text-sm font-semibold text-white">{stage.label}</p>
              <p className="mt-1 text-xs leading-5 text-zinc-400">{stage.summary}</p>
              <p className="mt-2 font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                {stage.evidence}
              </p>
            </li>
          );
        })}
      </ol>
    </div>
  );
}
