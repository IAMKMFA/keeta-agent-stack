import clsx from 'clsx';
import type { HTMLAttributes, ReactNode } from 'react';

interface CardProps extends Omit<HTMLAttributes<HTMLDivElement>, 'title'> {
  variant?: 'panel' | 'soft';
  padding?: 'none' | 'sm' | 'md' | 'lg';
  title?: ReactNode;
  kicker?: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
}

const paddingMap = {
  none: '',
  sm: 'p-4',
  md: 'p-5',
  lg: 'p-7',
} as const;

export function Card({
  variant = 'panel',
  padding = 'md',
  title,
  kicker,
  description,
  actions,
  className,
  children,
  ...rest
}: CardProps) {
  const hasHeader = Boolean(title || kicker || actions || description);
  return (
    <div
      {...rest}
      className={clsx(
        variant === 'panel' ? 'hub-panel' : 'hub-soft-panel',
        'animate-rise',
        className
      )}
    >
      {hasHeader ? (
        <div
          className={clsx(
            'flex items-start justify-between gap-4 border-b border-[var(--keeta-line)]',
            padding === 'lg' ? 'px-7 py-5' : 'px-5 py-4'
          )}
        >
          <div className="min-w-0">
            {kicker ? <div className="hub-kicker">{kicker}</div> : null}
            {title ? (
              <div className="hub-heading mt-1 text-base font-semibold text-[var(--keeta-ink)]">
                {title}
              </div>
            ) : null}
            {description ? (
              <div className="mt-1 text-xs text-[var(--keeta-muted)]">{description}</div>
            ) : null}
          </div>
          {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
        </div>
      ) : null}
      <div
        className={clsx(
          hasHeader && padding !== 'none' ? paddingMap[padding] : paddingMap[padding]
        )}
      >
        {children}
      </div>
    </div>
  );
}
