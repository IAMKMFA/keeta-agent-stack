export const shadow = {
  none: 'none',
  glow: '0 0 40px rgba(68, 241, 166, 0.14)',
  glowStrong: '0 0 80px rgba(68, 241, 166, 0.22)',
  cardElevated: '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)',
  ring: '0 0 0 2px rgba(68, 241, 166, 0.45)',
} as const;

export type ShadowToken = keyof typeof shadow;
