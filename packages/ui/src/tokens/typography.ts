export const typography = {
  family: {
    sans: 'var(--font-sans, ui-sans-serif, system-ui, sans-serif)',
    mono: 'var(--font-mono, ui-monospace, SFMono-Regular, Menlo, monospace)',
  },
  size: {
    xs: '0.75rem',
    sm: '0.875rem',
    base: '1rem',
    lg: '1.125rem',
    xl: '1.25rem',
    '2xl': '1.5rem',
    '3xl': '1.875rem',
    '4xl': '2.25rem',
    '5xl': '3rem',
    '6xl': '3.75rem',
    '7xl': '4.5rem',
  },
  weight: {
    regular: 400,
    medium: 500,
    semibold: 600,
    bold: 700,
  },
  letterSpacing: {
    tightish: '-0.015em',
    normal: '0',
    wide: '0.05em',
    widest: '0.18em',
  },
  leading: {
    tight: 1.1,
    snug: 1.25,
    normal: 1.5,
    relaxed: 1.6,
    loose: 1.75,
  },
} as const;

export type FontFamily = keyof typeof typography.family;
export type FontSize = keyof typeof typography.size;
export type FontWeight = keyof typeof typography.weight;
