'use client';

import { useEffect, useState } from 'react';
import { PIPELINE_STAGES, type PipelineStageId } from '@keeta-agent-stack/visualizer';
import { usePipelineDemo } from '@keeta-agent-stack/visualizer/client';
import { cn } from '../../lib/cn';

interface LogRow {
  readonly id: string;
  readonly stageId: PipelineStageId;
  readonly label: string;
  readonly summary: string;
  readonly emittedAt: string;
}

const stageEventName: Record<PipelineStageId, string> = {
  intent_created: 'intent.created',
  quotes_gathered: 'quotes.gathered',
  route_selected: 'route.selected',
  policy_allowed: 'policy.allowed',
  simulation_passed: 'simulation.passed',
  worker_executed: 'worker.executed',
  audit_emitted: 'audit.emitted',
};

const MAX_ROWS = 12;

/**
 * Visual event log. Subscribes to the demo pipeline orchestrator and
 * appends one row per stage transition. Rows carry a deterministic
 * relative timestamp so reduced-motion users get a static log without
 * "currently emitting" wobble.
 */
export function DemoEventLog({ className }: { readonly className?: string }) {
  const demo = usePipelineDemo();
  const [rows, setRows] = useState<ReadonlyArray<LogRow>>([]);

  useEffect(() => {
    const stage = demo.stages[demo.activeIndex];
    if (!stage) return;
    setRows((prev) => {
      const last = prev[prev.length - 1];
      if (last && last.stageId === stage.id) return prev;
      const next: LogRow = {
        id: `${stage.id}-${prev.length}`,
        stageId: stage.id,
        label: stageEventName[stage.id],
        summary: stage.summary,
        emittedAt: new Date().toLocaleTimeString(undefined, {
          hour: '2-digit',
          minute: '2-digit',
          second: '2-digit',
        }),
      };
      return [...prev.slice(-MAX_ROWS + 1), next];
    });
  }, [demo.activeIndex, demo.stages]);

  return (
    <figure
      className={cn('overflow-hidden rounded-lg border border-white/10 bg-graphite/70', className)}
    >
      <header className="flex items-center justify-between border-b border-white/5 px-4 py-2.5">
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          event log · /events
        </span>
        <span className="font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          last {Math.min(rows.length, MAX_ROWS)} events
        </span>
      </header>
      <ol
        aria-live="polite"
        aria-relevant="additions"
        className="max-h-72 divide-y divide-white/5 overflow-y-auto font-mono text-[12.5px]"
      >
        {rows.length === 0 ? (
          <li className="px-4 py-3 text-zinc-500">
            <span className="text-zinc-400">$</span> waiting for first event…
          </li>
        ) : (
          rows
            .slice()
            .reverse()
            .map((row) => (
              <li key={row.id} className="grid grid-cols-[auto_1fr_auto] gap-3 px-4 py-2.5">
                <span className="text-zinc-500">{row.emittedAt}</span>
                <span className="truncate text-zinc-200">
                  <span className="text-keeta">{row.label}</span>
                  <span className="ml-2 text-zinc-500">·</span>
                  <span className="ml-2 text-zinc-400">{row.summary}</span>
                </span>
                <span className="font-mono text-[10px] uppercase tracking-widest text-zinc-600">
                  {PIPELINE_STAGES.find((s) => s.id === row.stageId)?.label ?? row.stageId}
                </span>
              </li>
            ))
        )}
      </ol>
    </figure>
  );
}
