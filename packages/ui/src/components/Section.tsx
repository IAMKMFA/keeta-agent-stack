import type { HTMLAttributes, ReactNode } from 'react';
import { cn } from '../utils/cn.js';
import { Container } from './Container.js';

interface SectionProps extends Omit<HTMLAttributes<HTMLElement>, 'title'> {
  readonly children?: ReactNode;
  readonly eyebrow?: string;
  readonly title?: ReactNode;
  readonly description?: ReactNode;
  readonly bleed?: boolean;
  readonly density?: 'compact' | 'default' | 'spacious';
  readonly containerSize?: 'narrow' | 'default' | 'wide';
}

const densityClass: Record<NonNullable<SectionProps['density']>, string> = {
  compact: 'py-12',
  default: 'py-20',
  spacious: 'py-28',
};

export function Section({
  children,
  eyebrow,
  title,
  description,
  bleed = false,
  density = 'default',
  containerSize = 'default',
  className,
  ...rest
}: SectionProps) {
  const Inner = bleed ? 'div' : Container;
  const innerProps = bleed ? {} : { size: containerSize };
  return (
    <section className={cn(densityClass[density], className)} {...rest}>
      <Inner {...innerProps}>
        {(eyebrow || title || description) && (
          <header className="mb-10 max-w-3xl">
            {eyebrow ? (
              <p className="text-xs font-semibold uppercase tracking-widest text-keeta">
                {eyebrow}
              </p>
            ) : null}
            {title ? (
              <h2 className="mt-3 text-balance text-3xl font-semibold text-white md:text-4xl">
                {title}
              </h2>
            ) : null}
            {description ? (
              <p className="mt-4 text-pretty text-base leading-7 text-zinc-400">{description}</p>
            ) : null}
          </header>
        )}
        {children}
      </Inner>
    </section>
  );
}
