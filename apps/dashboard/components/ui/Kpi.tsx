import clsx from 'clsx';
import type { ReactNode } from 'react';

export type KpiTrend = 'up' | 'down' | 'flat';

export interface KpiProps {
  label: string;
  value: ReactNode;
  unit?: ReactNode;
  hint?: ReactNode;
  trend?: KpiTrend;
  delta?: ReactNode;
  icon?: ReactNode;
  className?: string;
  size?: 'sm' | 'md' | 'lg';
}

const trendClasses: Record<KpiTrend, string> = {
  up: 'text-[var(--keeta-success)] bg-[var(--keeta-success-soft)]',
  down: 'text-[var(--keeta-danger)] bg-[var(--keeta-danger-soft)]',
  flat: 'text-[var(--keeta-muted)] bg-[rgba(128,127,127,0.1)]',
};

const trendGlyph: Record<KpiTrend, string> = {
  up: '↑',
  down: '↓',
  flat: '→',
};

export function Kpi({
  label,
  value,
  unit,
  hint,
  trend,
  delta,
  icon,
  className,
  size = 'md',
}: KpiProps) {
  return (
    <div className={clsx('hub-soft-panel flex flex-col gap-2 p-5', className)}>
      <div className="flex items-center justify-between gap-3">
        <div className="hub-kicker">{label}</div>
        {icon ? <div className="text-[var(--keeta-muted)]">{icon}</div> : null}
      </div>
      <div className="flex items-baseline gap-2">
        <div
          className={clsx(
            'hub-heading font-semibold text-[var(--keeta-ink)]',
            size === 'lg' && 'text-4xl',
            size === 'md' && 'text-3xl',
            size === 'sm' && 'text-2xl'
          )}
        >
          {value}
        </div>
        {unit ? <div className="text-sm text-[var(--keeta-muted)]">{unit}</div> : null}
        {trend && delta ? (
          <div
            className={clsx(
              'ml-auto rounded-full px-2 py-0.5 font-mono text-[11px]',
              trendClasses[trend]
            )}
          >
            {trendGlyph[trend]} {delta}
          </div>
        ) : null}
      </div>
      {hint ? <div className="text-xs text-[var(--keeta-muted)]">{hint}</div> : null}
    </div>
  );
}

export function KpiGrid({
  children,
  columns = 4,
  className,
}: {
  children: ReactNode;
  columns?: 2 | 3 | 4 | 5 | 6;
  className?: string;
}) {
  const colMap: Record<number, string> = {
    2: 'sm:grid-cols-2',
    3: 'sm:grid-cols-2 lg:grid-cols-3',
    4: 'sm:grid-cols-2 lg:grid-cols-4',
    5: 'sm:grid-cols-2 lg:grid-cols-5',
    6: 'sm:grid-cols-2 lg:grid-cols-3 xl:grid-cols-6',
  };
  return (
    <div className={clsx('grid grid-cols-1 gap-3', colMap[columns], className)}>{children}</div>
  );
}
