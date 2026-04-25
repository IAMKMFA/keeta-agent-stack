import clsx from 'clsx';
import type { ReactNode } from 'react';

export function PageHeader({
  kicker,
  title,
  description,
  actions,
  meta,
  className,
}: {
  kicker?: ReactNode;
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  meta?: ReactNode;
  className?: string;
}) {
  return (
    <header className={clsx('flex flex-col gap-3', className)}>
      <div className="flex flex-wrap items-start justify-between gap-4">
        <div className="min-w-0">
          {kicker ? <div className="hub-kicker">{kicker}</div> : null}
          <h1 className="hub-heading mt-1 text-2xl font-semibold text-[var(--keeta-ink)] sm:text-3xl">
            {title}
          </h1>
          {description ? (
            <p className="mt-2 max-w-3xl text-sm text-[var(--keeta-muted)]">{description}</p>
          ) : null}
        </div>
        {actions ? <div className="flex shrink-0 items-center gap-2">{actions}</div> : null}
      </div>
      {meta ? <div className="flex flex-wrap items-center gap-2">{meta}</div> : null}
    </header>
  );
}

export function SectionHeader({
  title,
  description,
  actions,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  className?: string;
}) {
  return (
    <div className={clsx('flex flex-wrap items-end justify-between gap-3', className)}>
      <div>
        <h2 className="hub-heading text-lg font-semibold text-[var(--keeta-ink)]">{title}</h2>
        {description ? (
          <p className="mt-1 text-sm text-[var(--keeta-muted)]">{description}</p>
        ) : null}
      </div>
      {actions ? <div className="flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
