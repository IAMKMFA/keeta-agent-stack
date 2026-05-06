import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface StatusPillProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly status: 'live' | 'demo' | 'degraded' | 'paused' | 'unknown';
  readonly pulse?: boolean;
}

const dotClass: Record<StatusPillProps['status'], string> = {
  live: 'bg-keeta',
  demo: 'bg-cyanline',
  degraded: 'bg-amber-300',
  paused: 'bg-zinc-400',
  unknown: 'bg-zinc-500',
};

const labelClass: Record<StatusPillProps['status'], string> = {
  live: 'text-keeta',
  demo: 'text-cyanline',
  degraded: 'text-amber-300',
  paused: 'text-zinc-300',
  unknown: 'text-zinc-400',
};

export function StatusPill({
  children,
  status,
  pulse = false,
  className,
  ...rest
}: StatusPillProps) {
  return (
    <span
      className={cn(
        'inline-flex items-center gap-2 rounded-full border border-white/10 bg-panel/60 px-3 py-1 font-mono text-[11px] uppercase tracking-widest',
        labelClass[status],
        className
      )}
      {...rest}
    >
      <span
        aria-hidden
        className={cn('relative inline-flex h-2 w-2 rounded-full', dotClass[status])}
      >
        {pulse ? (
          <span
            aria-hidden
            className={cn(
              'absolute inline-flex h-full w-full animate-ping rounded-full opacity-60',
              dotClass[status]
            )}
          />
        ) : null}
      </span>
      <span>{children}</span>
    </span>
  );
}
