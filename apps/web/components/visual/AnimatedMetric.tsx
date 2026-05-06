'use client';

import { useEffect, useRef, useState } from 'react';

interface AnimatedMetricProps {
  readonly value: string;
  readonly label: string;
  readonly hint?: string;
}

const NUMERIC_REGEX = /(\d+(?:\.\d+)?)/;

/**
 * Counts up to a numeric prefix in `value` once the metric scrolls into
 * view. If `value` does not start with a number (e.g. "40+"), the
 * component renders the raw string without any animation.
 *
 * Respects `prefers-reduced-motion` by snapping to the final value.
 */
export function AnimatedMetric({ value, label, hint }: AnimatedMetricProps) {
  const ref = useRef<HTMLDivElement | null>(null);
  const [display, setDisplay] = useState(value);

  useEffect(() => {
    const node = ref.current;
    if (!node) return;
    const reduceMotion =
      typeof window !== 'undefined' &&
      typeof window.matchMedia === 'function' &&
      window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const match = NUMERIC_REGEX.exec(value);
    const numericPart = match?.[1];
    if (!match || !numericPart || reduceMotion) {
      setDisplay(value);
      return;
    }
    const target = Number.parseFloat(numericPart);
    if (!Number.isFinite(target)) {
      setDisplay(value);
      return;
    }
    const decimals = numericPart.split('.')[1]?.length ?? 0;
    const suffix = value.slice(match.index + numericPart.length);
    const prefix = value.slice(0, match.index);
    let rafId: number | null = null;
    let observer: IntersectionObserver | null = null;
    let started = false;

    const animate = (start: number) => {
      const duration = 900;
      const step = (now: number) => {
        const progress = Math.min((now - start) / duration, 1);
        const eased = 1 - Math.pow(1 - progress, 3);
        const current = (target * eased).toFixed(decimals);
        setDisplay(`${prefix}${current}${suffix}`);
        if (progress < 1) rafId = requestAnimationFrame(step);
      };
      rafId = requestAnimationFrame(step);
    };

    observer = new IntersectionObserver(
      (entries) => {
        for (const entry of entries) {
          if (entry.isIntersecting && !started) {
            started = true;
            animate(performance.now());
          }
        }
      },
      { threshold: 0.4 }
    );
    observer.observe(node);

    return () => {
      if (rafId !== null) cancelAnimationFrame(rafId);
      observer?.disconnect();
    };
  }, [value]);

  return (
    <div ref={ref} className="surface-card surface-card-hover px-5 py-6">
      <div className="font-mono text-3xl font-semibold tracking-tightish text-white md:text-4xl">
        {display}
      </div>
      <div className="mt-2 text-sm font-medium text-zinc-300">{label}</div>
      {hint ? <div className="mt-1 text-xs text-zinc-500">{hint}</div> : null}
    </div>
  );
}
