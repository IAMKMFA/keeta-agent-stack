import { useCallback, useEffect, useRef, useState } from 'react';
import {
  PIPELINE_STAGES,
  PIPELINE_STAGE_ORDER,
  type PipelineStageId,
  type PipelineStageMeta,
} from '../data/demo-pipeline.js';
import { useReducedMotionSafe } from './useReducedMotionSafe.js';

export interface PipelineDemoState {
  readonly stages: ReadonlyArray<PipelineStageMeta>;
  readonly activeIndex: number;
  readonly activeId: PipelineStageId;
  readonly isComplete: boolean;
  readonly isRunning: boolean;
  readonly start: () => void;
  readonly pause: () => void;
  readonly reset: () => void;
}

export interface UsePipelineDemoOptions {
  /** If true, start ticking as soon as the hook mounts. Default true. */
  readonly autoStart?: boolean;
  /**
   * If true, restart the loop after `audit_emitted`. Default true.
   * Reduced-motion users always see the static end state regardless.
   */
  readonly loop?: boolean;
}

/**
 * Demo orchestrator. Steps through the seven pipeline stages on a
 * real-time clock so the homepage can show a deterministic, repeatable
 * animation without any server.
 *
 * Reduced-motion behaviour: the hook collapses to the final stage and
 * stops ticking. The visual layer is responsible for showing the
 * static "all stages complete" composition.
 */
export function usePipelineDemo(options: UsePipelineDemoOptions = {}): PipelineDemoState {
  const { autoStart = true, loop = true } = options;
  const reduced = useReducedMotionSafe();

  const [activeIndex, setActiveIndex] = useState<number>(reduced ? PIPELINE_STAGES.length - 1 : 0);
  const [running, setRunning] = useState<boolean>(autoStart && !reduced);
  const timerRef = useRef<ReturnType<typeof setTimeout> | null>(null);

  useEffect(() => {
    if (reduced) {
      setActiveIndex(PIPELINE_STAGES.length - 1);
      setRunning(false);
    }
  }, [reduced]);

  useEffect(() => {
    if (!running || reduced) return;
    const stage = PIPELINE_STAGES[activeIndex];
    if (!stage) return;
    timerRef.current = setTimeout(() => {
      const isLast = activeIndex >= PIPELINE_STAGES.length - 1;
      if (isLast) {
        if (loop) {
          setActiveIndex(0);
        } else {
          setRunning(false);
        }
      } else {
        setActiveIndex(activeIndex + 1);
      }
    }, stage.dwellMs);
    return () => {
      if (timerRef.current !== null) clearTimeout(timerRef.current);
    };
  }, [activeIndex, running, reduced, loop]);

  const start = useCallback(() => {
    if (reduced) return;
    setRunning(true);
  }, [reduced]);

  const pause = useCallback(() => {
    setRunning(false);
  }, []);

  const reset = useCallback(() => {
    if (reduced) {
      setActiveIndex(PIPELINE_STAGES.length - 1);
      return;
    }
    setActiveIndex(0);
  }, [reduced]);

  const safeIndex = Math.min(Math.max(activeIndex, 0), PIPELINE_STAGES.length - 1);
  const activeStage = PIPELINE_STAGES[safeIndex] ?? PIPELINE_STAGES[0]!;

  return {
    stages: PIPELINE_STAGES,
    activeIndex: safeIndex,
    activeId: activeStage.id,
    isComplete: safeIndex === PIPELINE_STAGES.length - 1,
    isRunning: running,
    start,
    pause,
    reset,
  };
}

export { PIPELINE_STAGE_ORDER };
