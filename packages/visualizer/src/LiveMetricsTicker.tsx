import { cn } from '@keeta-agent-stack/ui';
import { DEMO_METRICS, type DemoMetric } from './data/demo-pipeline.js';
import { useAnimatedNumber } from './hooks/useAnimatedNumber.js';

interface LiveMetricsTickerProps {
  readonly className?: string;
  readonly metrics?: ReadonlyArray<DemoMetric>;
}

/**
 * Compact horizontal strip of headline metrics. Each value uses
 * `useAnimatedNumber` to count up from zero on first render; reduced
 * motion users see the final value immediately.
 */
export function LiveMetricsTicker({ className, metrics = DEMO_METRICS }: LiveMetricsTickerProps) {
  return (
    <ul
      className={cn(
        'grid gap-3 rounded-lg border border-white/10 bg-panel/60 p-4 sm:grid-cols-2 lg:grid-cols-4',
        className
      )}
    >
      {metrics.map((metric) => (
        <li
          key={metric.id}
          className="metric-sheen rounded-md border border-white/5 bg-black/10 p-3"
        >
          <MetricValue metric={metric} />
          <span className="text-xs text-zinc-400">{metric.label}</span>
        </li>
      ))}
    </ul>
  );
}

function MetricValue({ metric }: { readonly metric: DemoMetric }) {
  const formatted = useAnimatedNumber(metric.value, {
    durationMs: 1200,
    precision: metric.precision ?? 0,
  });
  return (
    <span className="font-mono text-2xl font-semibold tracking-tightish text-white">
      {formatted}
      {metric.suffix ? <span className="ml-1 text-zinc-400">{metric.suffix}</span> : null}
    </span>
  );
}
