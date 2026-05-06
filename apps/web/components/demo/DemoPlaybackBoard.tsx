'use client';

import { Pause, Play, RotateCcw } from 'lucide-react';
import { Button, StatusPill } from '@keeta-agent-stack/ui';
import {
  ExecutionTimeline,
  IntentPipeline,
  PolicyGate,
  RouteGraph,
  SimulationConsole,
  usePipelineDemo,
} from '@keeta-agent-stack/visualizer/client';
import { PIPELINE_STAGES } from '@keeta-agent-stack/visualizer';
import { DemoEventLog } from '../sections/DemoEventLog';

/**
 * Full-page interactive demo board. Owns the pipeline orchestrator
 * (`usePipelineDemo`) so playback controls (play, pause, reset) live
 * in one place and every visualizer below mirrors the same `activeId`.
 * No backend calls; deterministic fixtures only.
 */
export function DemoPlaybackBoard() {
  const demo = usePipelineDemo();
  const activeStage = demo.stages[demo.activeIndex] ?? PIPELINE_STAGES[0]!;

  return (
    <div>
      <div className="flex flex-wrap items-center justify-between gap-3 rounded-lg border border-white/10 bg-panel/60 p-3">
        <div className="flex flex-wrap items-center gap-2">
          {demo.isRunning ? (
            <Button
              variant="secondary"
              size="sm"
              leftSlot={<Pause aria-hidden className="h-3.5 w-3.5" />}
              onClick={demo.pause}
            >
              Pause
            </Button>
          ) : (
            <Button
              variant="primary"
              size="sm"
              leftSlot={<Play aria-hidden className="h-3.5 w-3.5" />}
              onClick={demo.start}
            >
              Play
            </Button>
          )}
          <Button
            variant="ghost"
            size="sm"
            leftSlot={<RotateCcw aria-hidden className="h-3.5 w-3.5" />}
            onClick={demo.reset}
          >
            Reset
          </Button>
        </div>
        <div className="flex items-center gap-3">
          <StatusPill status={demo.isRunning ? 'live' : 'paused'} pulse={demo.isRunning}>
            {demo.isRunning ? 'playing' : 'paused'}
          </StatusPill>
          <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
            stage {demo.activeIndex + 1} / {demo.stages.length} ·{' '}
            <span className="text-keeta">{activeStage.label}</span>
          </span>
        </div>
      </div>

      <div className="mt-6">
        <IntentPipeline activeId={demo.activeId} />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <PolicyGate />
        <SimulationConsole />
      </div>

      <div className="mt-6 grid gap-5 lg:grid-cols-[1.1fr_0.9fr]">
        <RouteGraph />
        <DemoEventLog />
      </div>

      <div className="mt-6">
        <ExecutionTimeline />
      </div>
    </div>
  );
}
