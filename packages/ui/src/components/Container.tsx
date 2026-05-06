import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';

interface ContainerProps extends HTMLAttributes<HTMLDivElement> {
  readonly children: ReactNode;
  readonly size?: 'narrow' | 'default' | 'wide';
}

const sizeClass: Record<NonNullable<ContainerProps['size']>, string> = {
  narrow: 'max-w-3xl',
  default: 'max-w-7xl',
  wide: 'max-w-[88rem]',
};

export function Container({ children, size = 'default', className, ...rest }: ContainerProps) {
  return (
    <div className={cn('mx-auto w-full px-5', sizeClass[size], className)} {...rest}>
      {children}
    </div>
  );
}
