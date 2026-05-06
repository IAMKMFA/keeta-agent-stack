import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface CardProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly tone?: 'glass' | 'solid' | 'outline';
  readonly interactive?: boolean;
  readonly padding?: 'none' | 'sm' | 'md' | 'lg';
}

const toneClass: Record<NonNullable<CardProps['tone']>, string> = {
  glass: 'border border-white/10 bg-panel/85 backdrop-blur',
  solid: 'border border-white/10 bg-panel',
  outline: 'border border-white/15 bg-transparent',
};

const paddingClass: Record<NonNullable<CardProps['padding']>, string> = {
  none: '',
  sm: 'p-4',
  md: 'p-6',
  lg: 'p-8',
};

const interactiveClass =
  'transition-[transform,border-color,box-shadow] duration-200 ease-out hover:-translate-y-0.5 hover:border-keeta/35 hover:shadow-[0_1px_0_rgba(255,255,255,0.04)_inset,0_8px_32px_rgba(0,0,0,0.45)]';

export function Card({
  children,
  tone = 'glass',
  interactive = false,
  padding = 'md',
  className,
  ...rest
}: CardProps) {
  return (
    <div
      className={cn(
        'rounded-lg',
        toneClass[tone],
        paddingClass[padding],
        interactive && interactiveClass,
        className
      )}
      {...rest}
    >
      {children}
    </div>
  );
}
