'use client';

import { useEffect, useState, type ReactNode } from 'react';

interface ReducedMotionBoundaryProps {
  readonly children: ReactNode;
  readonly fallback?: ReactNode;
}

/**
 * Renders `fallback` when the user has requested reduced motion at the
 * OS level. Use this around purely decorative animated content where a
 * static placeholder is preferable.
 *
 * On the server (and during the first client render before hydration)
 * the boundary returns `children` to avoid layout shift, then swaps to
 * the fallback if the media query matches.
 */
export function ReducedMotionBoundary({ children, fallback }: ReducedMotionBoundaryProps) {
  const [reduced, setReduced] = useState(false);

  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const query = window.matchMedia('(prefers-reduced-motion: reduce)');
    const handler = () => setReduced(query.matches);
    handler();
    query.addEventListener('change', handler);
    return () => query.removeEventListener('change', handler);
  }, []);

  if (reduced && fallback !== undefined) {
    return <>{fallback}</>;
  }

  return <>{children}</>;
}
