/**
 * Color tokens for the Keeta Agent Stack design system.
 *
 * Stored as plain hex strings so they are framework-agnostic. The
 * Tailwind config in `apps/web/tailwind.config.ts` mirrors the same
 * names; future apps can either import these tokens at config time
 * or duplicate them deliberately.
 */
export const colors = {
  graphite: '#080b0f',
  panel: '#10161c',
  line: '#21313a',
  keeta: '#44f1a6',
  cyanline: '#5ad7ff',
  ember: '#ffb46b',
  violet: '#b58cff',
  ink: {
    50: '#f7f9fa',
    100: '#dde6ec',
    200: '#a9bcc7',
    300: '#7d94a3',
    400: '#5a7080',
    500: '#3f5562',
    600: '#2c3d49',
    700: '#1c2832',
    800: '#121a22',
    900: '#0a1018',
  },
  state: {
    success: '#44f1a6',
    warning: '#ffb46b',
    danger: '#ff7a8a',
    info: '#5ad7ff',
    neutral: '#7d94a3',
  },
} as const;

export type ColorScale = typeof colors.ink;
export type StateTone = keyof typeof colors.state;
