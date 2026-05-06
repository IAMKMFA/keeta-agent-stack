import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface BadgeProps extends HTMLAttributes<HTMLSpanElement> {
  readonly children: ReactNode;
  readonly tone?: 'neutral' | 'success' | 'info' | 'warning' | 'danger' | 'accent';
  readonly variant?: 'soft' | 'outline';
}

const baseClass =
  'inline-flex items-center gap-1.5 rounded-full px-2.5 py-1 text-[11px] font-semibold uppercase tracking-widest';

const toneSoftClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'bg-white/5 text-zinc-300',
  success: 'bg-keeta/10 text-keeta',
  info: 'bg-cyanline/10 text-cyanline',
  warning: 'bg-amber-300/10 text-amber-300',
  danger: 'bg-rose-300/10 text-rose-300',
  accent: 'bg-violet/10 text-violet',
};

const toneOutlineClass: Record<NonNullable<BadgeProps['tone']>, string> = {
  neutral: 'border border-white/15 text-zinc-200',
  success: 'border border-keeta/40 text-keeta',
  info: 'border border-cyanline/40 text-cyanline',
  warning: 'border border-amber-300/40 text-amber-300',
  danger: 'border border-rose-300/40 text-rose-300',
  accent: 'border border-violet/40 text-violet',
};

export function Badge({
  children,
  tone = 'neutral',
  variant = 'soft',
  className,
  ...rest
}: BadgeProps) {
  const toneClass = variant === 'soft' ? toneSoftClass[tone] : toneOutlineClass[tone];
  return (
    <span className={cn(baseClass, toneClass, className)} {...rest}>
      {children}
    </span>
  );
}
