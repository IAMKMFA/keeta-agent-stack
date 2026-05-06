'use client';

import { m } from 'framer-motion';
import type { ReactNode } from 'react';

interface RevealProps {
  readonly children: ReactNode;
  readonly delay?: number;
  readonly className?: string;
  readonly as?: 'div' | 'section' | 'article' | 'li' | 'span';
}

const baseTransition = {
  duration: 0.42,
  ease: [0.22, 1, 0.36, 1] as [number, number, number, number],
};

export function Reveal({ children, delay = 0, className, as = 'div' }: RevealProps) {
  const Tag = m[as];
  return (
    <Tag
      initial={{ opacity: 0, y: 8 }}
      whileInView={{ opacity: 1, y: 0 }}
      viewport={{ once: true, margin: '-10% 0px' }}
      transition={{ ...baseTransition, delay }}
      className={className}
    >
      {children}
    </Tag>
  );
}
