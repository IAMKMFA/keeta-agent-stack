import { formatNumber } from '../../lib/format';

interface FunnelProps {
  intents: number;
  routes: number;
  decided: number;
  executed: number;
  settled: number;
}

interface Stage {
  label: string;
  value: number;
}

export function PipelineFunnel({ intents, routes, decided, executed, settled }: FunnelProps) {
  const stages: Stage[] = [
    { label: 'Intents', value: intents },
    { label: 'Routes', value: routes },
    { label: 'Policy decisions', value: decided },
    { label: 'Executions', value: executed },
    { label: 'Settled', value: settled },
  ];
  const max = Math.max(...stages.map((s) => s.value), 1);

  return (
    <div className="space-y-3">
      {stages.map((stage, idx) => {
        const width = Math.max(4, Math.round((stage.value / max) * 100));
        const conversion =
          idx > 0 && stages[idx - 1]!.value > 0
            ? Math.round((stage.value / stages[idx - 1]!.value) * 1000) / 10
            : null;
        return (
          <div key={stage.label} className="space-y-1">
            <div className="flex items-baseline justify-between text-sm">
              <span className="font-medium text-[var(--keeta-ink)]">{stage.label}</span>
              <span className="flex items-baseline gap-2 font-mono text-xs text-[var(--keeta-muted)]">
                {conversion != null ? <span>{conversion}%</span> : null}
                <span className="text-[var(--keeta-ink)]">{formatNumber(stage.value)}</span>
              </span>
            </div>
            <div className="h-2 overflow-hidden rounded-full bg-[rgba(50,149,144,0.08)]">
              <div
                className="h-full rounded-full bg-gradient-to-r from-[var(--keeta-accent)] to-[var(--keeta-accent-deep)] transition-all"
                style={{ width: `${width}%` }}
              />
            </div>
          </div>
        );
      })}
    </div>
  );
}
