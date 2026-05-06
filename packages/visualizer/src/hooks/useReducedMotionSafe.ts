import { useEffect, useState } from 'react';

const QUERY = '(prefers-reduced-motion: reduce)';

/**
 * Reduced-motion hook with safe SSR defaults.
 *
 * Returns `true` only after hydration confirms the user has
 * `prefers-reduced-motion: reduce` set. SSR and the very first render
 * always return `false` so server-rendered markup matches the client
 * markup, avoiding hydration mismatches.
 *
 * Components that need to animate should still degrade gracefully when
 * this flag is `true` and apply their static fallback.
 */
export function useReducedMotionSafe(): boolean {
  const [reduced, setReduced] = useState(false);
  useEffect(() => {
    if (typeof window === 'undefined' || typeof window.matchMedia !== 'function') {
      return;
    }
    const media = window.matchMedia(QUERY);
    setReduced(media.matches);
    const onChange = (event: MediaQueryListEvent) => setReduced(event.matches);
    media.addEventListener('change', onChange);
    return () => media.removeEventListener('change', onChange);
  }, []);
  return reduced;
}
