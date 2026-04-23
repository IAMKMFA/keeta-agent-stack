import clsx from 'clsx';
import type { ReactNode } from 'react';

export function EmptyState({
  title,
  description,
  actions,
  icon,
  className,
}: {
  title: ReactNode;
  description?: ReactNode;
  actions?: ReactNode;
  icon?: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={clsx(
        'flex flex-col items-center justify-center gap-2 rounded-2xl border border-dashed border-[var(--keeta-line)] bg-[rgba(255,255,255,0.5)] p-10 text-center',
        className
      )}
    >
      {icon ? <div className="text-2xl text-[var(--keeta-muted)]">{icon}</div> : null}
      <div className="hub-heading text-base font-semibold text-[var(--keeta-ink)]">{title}</div>
      {description ? (
        <p className="max-w-md text-sm text-[var(--keeta-muted)]">{description}</p>
      ) : null}
      {actions ? <div className="mt-2 flex items-center gap-2">{actions}</div> : null}
    </div>
  );
}
