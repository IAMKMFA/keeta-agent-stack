import { useEffect, useRef, useState } from 'react';
import { useReducedMotionSafe } from './useReducedMotionSafe.js';

interface AnimatedNumberOptions {
  readonly durationMs?: number;
  readonly precision?: number;
}

/**
 * Animates a numeric value toward `target` over `durationMs`. Returns
 * a string formatted to the requested `precision`. Honours
 * `prefers-reduced-motion`: jumps straight to the target.
 */
export function useAnimatedNumber(target: number, options: AnimatedNumberOptions = {}): string {
  const { durationMs = 900, precision = 0 } = options;
  const reduced = useReducedMotionSafe();
  const [value, setValue] = useState<number>(target);
  const fromRef = useRef<number>(target);
  const startedAtRef = useRef<number>(0);
  const rafRef = useRef<number | null>(null);

  useEffect(() => {
    if (reduced || durationMs <= 0) {
      setValue(target);
      return;
    }
    fromRef.current = value;
    startedAtRef.current = performance.now();

    const step = (now: number) => {
      const elapsed = now - startedAtRef.current;
      const t = Math.min(1, elapsed / durationMs);
      const eased = 1 - Math.pow(1 - t, 3);
      setValue(fromRef.current + (target - fromRef.current) * eased);
      if (t < 1) {
        rafRef.current = requestAnimationFrame(step);
      } else {
        rafRef.current = null;
      }
    };

    rafRef.current = requestAnimationFrame(step);
    return () => {
      if (rafRef.current !== null) cancelAnimationFrame(rafRef.current);
    };
  }, [target, durationMs, reduced]);

  const formatter = numberFormatter(precision);
  return formatter.format(value);
}

const formatterCache = new Map<number, Intl.NumberFormat>();

function numberFormatter(precision: number): Intl.NumberFormat {
  const cached = formatterCache.get(precision);
  if (cached) return cached;
  const formatter = new Intl.NumberFormat('en-US', {
    maximumFractionDigits: precision,
    minimumFractionDigits: precision,
  });
  formatterCache.set(precision, formatter);
  return formatter;
}
