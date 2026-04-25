import clsx from 'clsx';
import type { ButtonHTMLAttributes, ReactNode } from 'react';

export type ButtonVariant = 'primary' | 'secondary' | 'ghost' | 'danger';
export type ButtonSize = 'sm' | 'md' | 'lg';

interface ButtonProps extends ButtonHTMLAttributes<HTMLButtonElement> {
  variant?: ButtonVariant;
  size?: ButtonSize;
  leadingIcon?: ReactNode;
  trailingIcon?: ReactNode;
  fullWidth?: boolean;
}

const variantClasses: Record<ButtonVariant, string> = {
  primary:
    'bg-[var(--keeta-accent)] text-white hover:bg-[var(--keeta-accent-deep)] disabled:bg-[rgba(50,149,144,0.5)]',
  secondary:
    'border border-[var(--keeta-line-strong)] bg-white text-[var(--keeta-ink)] hover:bg-[rgba(50,149,144,0.06)]',
  ghost: 'text-[var(--keeta-ink-subtle)] hover:bg-[rgba(50,149,144,0.08)]',
  danger:
    'bg-[var(--keeta-danger)] text-white hover:bg-[#9e2e32] disabled:bg-[rgba(190,63,67,0.5)]',
};

const sizeClasses: Record<ButtonSize, string> = {
  sm: 'text-xs h-8 px-3',
  md: 'text-sm h-10 px-4',
  lg: 'text-base h-12 px-5',
};

export function Button({
  variant = 'primary',
  size = 'md',
  leadingIcon,
  trailingIcon,
  fullWidth,
  className,
  children,
  ...rest
}: ButtonProps) {
  return (
    <button
      {...rest}
      className={clsx(
        'inline-flex items-center justify-center gap-2 rounded-xl font-medium transition disabled:cursor-not-allowed disabled:opacity-70',
        variantClasses[variant],
        sizeClasses[size],
        fullWidth && 'w-full',
        className
      )}
    >
      {leadingIcon ? <span className="shrink-0">{leadingIcon}</span> : null}
      <span>{children}</span>
      {trailingIcon ? <span className="shrink-0">{trailingIcon}</span> : null}
    </button>
  );
}
