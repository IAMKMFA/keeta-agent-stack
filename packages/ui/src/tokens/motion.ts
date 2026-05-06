/**
 * Motion tokens. We are deliberately conservative: short hover
 * transitions and one-shot reveal transitions only. Anything more
 * elaborate must respect `prefers-reduced-motion`.
 */
export const motion = {
  duration: {
    instant: 0,
    fast: 120,
    base: 200,
    slow: 320,
    reveal: 480,
  },
  easing: {
    linear: 'linear',
    standard: 'cubic-bezier(0.22, 1, 0.36, 1)',
    emphasized: 'cubic-bezier(0.2, 0, 0, 1)',
    accelerate: 'cubic-bezier(0.4, 0, 1, 1)',
    decelerate: 'cubic-bezier(0, 0, 0.2, 1)',
  },
} as const;

export type MotionDuration = keyof typeof motion.duration;
export type MotionEasing = keyof typeof motion.easing;
