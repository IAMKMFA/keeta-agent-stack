import type { AnchorHTMLAttributes, ButtonHTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

type Variant = 'primary' | 'secondary' | 'ghost' | 'danger';
type Size = 'sm' | 'md' | 'lg';

interface SharedButtonProps {
  readonly variant?: Variant;
  readonly size?: Size;
  readonly leftSlot?: ReactNode;
  readonly rightSlot?: ReactNode;
  readonly children: ReactNode;
  readonly className?: string;
}

type ButtonElementProps = SharedButtonProps &
  Omit<ButtonHTMLAttributes<HTMLButtonElement>, keyof SharedButtonProps> & {
    readonly href?: undefined;
  };

type AnchorElementProps = SharedButtonProps &
  Omit<AnchorHTMLAttributes<HTMLAnchorElement>, keyof SharedButtonProps> & {
    readonly href: string;
  };

export type ButtonProps = ButtonElementProps | AnchorElementProps;

const baseClass =
  'inline-flex items-center justify-center gap-2 rounded-md font-semibold transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite disabled:pointer-events-none disabled:opacity-60';

const sizeClass: Record<Size, string> = {
  sm: 'h-8 px-3 text-sm',
  md: 'h-10 px-4 text-sm',
  lg: 'h-12 px-5 text-base',
};

const variantClass: Record<Variant, string> = {
  primary:
    'bg-keeta text-black hover:bg-keeta/90 active:translate-y-px shadow-[0_1px_0_rgba(255,255,255,0.18)_inset]',
  secondary:
    'border border-white/15 text-zinc-100 hover:border-keeta/40 hover:text-white active:translate-y-px',
  ghost: 'text-zinc-300 hover:bg-white/5 hover:text-white',
  danger:
    'bg-rose-500/90 text-white hover:bg-rose-500 active:translate-y-px shadow-[0_1px_0_rgba(255,255,255,0.2)_inset]',
};

function isAnchor(props: ButtonProps): props is AnchorElementProps {
  return typeof props.href === 'string';
}

export function Button(props: ButtonProps) {
  const { variant = 'primary', size = 'md', leftSlot, rightSlot, children, className } = props;

  const composed = cn(baseClass, sizeClass[size], variantClass[variant], className);

  if (isAnchor(props)) {
    const { href, ...rest } = props;
    return (
      <a href={href} className={composed} {...rest}>
        {leftSlot}
        <span>{children}</span>
        {rightSlot}
      </a>
    );
  }

  const { type = 'button', ...rest } = props;
  return (
    <button type={type} className={composed} {...rest}>
      {leftSlot}
      <span>{children}</span>
      {rightSlot}
    </button>
  );
}
