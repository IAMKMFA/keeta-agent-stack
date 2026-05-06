'use client';

import type { ReactNode } from 'react';
import { LazyMotion, domAnimation, MotionConfig } from 'framer-motion';

interface MotionProviderProps {
  readonly children: ReactNode;
}

/**
 * Lazy-loads only the DOM animation feature set so the homepage's first
 * paint stays small. Per Phase 2 motion is intentionally minimal.
 */
export function MotionProvider({ children }: MotionProviderProps) {
  return (
    <LazyMotion features={domAnimation} strict>
      <MotionConfig reducedMotion="user">{children}</MotionConfig>
    </LazyMotion>
  );
}
