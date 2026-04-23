import clsx from 'clsx';
import type { ReactNode } from 'react';

export type StatusTone =
  | 'neutral'
  | 'info'
  | 'success'
  | 'warning'
  | 'danger'
  | 'accent';

const toneClasses: Record<StatusTone, string> = {
  neutral:
    'border border-[var(--keeta-line-strong)] bg-[rgba(255,255,255,0.7)] text-[var(--keeta-ink-subtle)]',
  info:
    'border border-[rgba(20,117,152,0.3)] bg-[rgba(20,117,152,0.1)] text-[var(--keeta-accent-deep)]',
  success:
    'border border-[rgba(47,143,107,0.3)] bg-[var(--keeta-success-soft)] text-[var(--keeta-success)]',
  warning:
    'border border-[rgba(184,118,42,0.3)] bg-[var(--keeta-warning-soft)] text-[var(--keeta-warning)]',
  danger:
    'border border-[rgba(190,63,67,0.3)] bg-[var(--keeta-danger-soft)] text-[var(--keeta-danger)]',
  accent:
    'border border-[rgba(50,149,144,0.36)] bg-[var(--keeta-accent-soft)] text-[#225f5c]',
};

export function StatusPill({
  tone = 'neutral',
  children,
  dot = true,
  className,
}: {
  tone?: StatusTone;
  children: ReactNode;
  dot?: boolean;
  className?: string;
}) {
  return (
    <span
      className={clsx(
        'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 font-mono text-[11px] uppercase tracking-wide',
        toneClasses[tone],
        className
      )}
    >
      {dot ? (
        <span
          className={clsx(
            'h-1.5 w-1.5 rounded-full',
            tone === 'success' && 'bg-[var(--keeta-success)]',
            tone === 'danger' && 'bg-[var(--keeta-danger)]',
            tone === 'warning' && 'bg-[var(--keeta-warning)]',
            tone === 'info' && 'bg-[var(--keeta-accent-deep)]',
            tone === 'accent' && 'bg-[var(--keeta-accent)]',
            tone === 'neutral' && 'bg-[var(--keeta-muted)]'
          )}
        />
      ) : null}
      <span>{children}</span>
    </span>
  );
}
