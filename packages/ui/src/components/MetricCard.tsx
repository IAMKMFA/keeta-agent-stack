import type { ReactNode } from 'react';
import { cn } from '../utils/cn.js';
import { Card } from './Card.js';

interface MetricCardProps {
  readonly label: string;
  readonly value: ReactNode;
  readonly hint?: ReactNode;
  readonly trend?: {
    readonly direction: 'up' | 'down' | 'flat';
    readonly description: string;
  };
  readonly className?: string;
}

const trendColor: Record<NonNullable<MetricCardProps['trend']>['direction'], string> = {
  up: 'text-keeta',
  down: 'text-rose-300',
  flat: 'text-zinc-400',
};

const trendGlyph: Record<NonNullable<MetricCardProps['trend']>['direction'], string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function MetricCard({ label, value, hint, trend, className }: MetricCardProps) {
  return (
    <Card interactive padding="md" className={cn('flex flex-col gap-2', className)}>
      <div className="font-mono text-3xl font-semibold tracking-tightish text-white md:text-4xl">
        {value}
      </div>
      <div className="text-sm font-medium text-zinc-300">{label}</div>
      {hint ? <div className="text-xs text-zinc-500">{hint}</div> : null}
      {trend ? (
        <div className={cn('mt-1 flex items-center gap-1 text-xs', trendColor[trend.direction])}>
          <span aria-hidden>{trendGlyph[trend.direction]}</span>
          <span>{trend.description}</span>
        </div>
      ) : null}
    </Card>
  );
}
