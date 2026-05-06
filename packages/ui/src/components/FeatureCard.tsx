import type { ComponentType, ReactNode } from 'react';
import { cn } from '../utils/cn.js';
import { Card } from './Card.js';

interface FeatureCardProps {
  readonly title: string;
  readonly summary: ReactNode;
  readonly footnote?: ReactNode;
  readonly icon?: ComponentType<{ className?: string; 'aria-hidden'?: boolean }>;
  readonly href?: string;
  readonly className?: string;
}

export function FeatureCard({
  title,
  summary,
  footnote,
  icon: Icon,
  href,
  className,
}: FeatureCardProps) {
  const inner = (
    <Card interactive padding="md" className={cn('flex h-full flex-col', className)}>
      {Icon ? (
        <div className="text-keeta">
          <Icon className="h-5 w-5" aria-hidden />
        </div>
      ) : null}
      <h3 className="mt-4 text-lg font-semibold text-white">{title}</h3>
      <div className="mt-2 text-sm leading-6 text-zinc-400">{summary}</div>
      {footnote ? (
        <p className="mt-4 font-mono text-[11px] uppercase tracking-widest text-zinc-500">
          {footnote}
        </p>
      ) : null}
    </Card>
  );

  if (href) {
    return (
      <a
        href={href}
        className="group block focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-keeta/60 focus-visible:ring-offset-2 focus-visible:ring-offset-graphite"
      >
        {inner}
      </a>
    );
  }
  return inner;
}
