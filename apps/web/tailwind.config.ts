import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  darkMode: 'class',
  theme: {
    extend: {
      colors: {
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
      },
      fontFamily: {
        sans: ['var(--font-sans)', 'ui-sans-serif', 'system-ui', 'sans-serif'],
        mono: ['var(--font-mono)', 'ui-monospace', 'SFMono-Regular', 'monospace'],
      },
      boxShadow: {
        glow: '0 0 40px rgba(68, 241, 166, 0.14)',
        'glow-strong': '0 0 80px rgba(68, 241, 166, 0.22)',
        'card-elevated': '0 1px 0 rgba(255,255,255,0.04) inset, 0 8px 32px rgba(0,0,0,0.45)',
      },
      backgroundImage: {
        'grid-faint':
          'linear-gradient(rgba(255,255,255,0.04) 1px, transparent 1px), linear-gradient(90deg, rgba(255,255,255,0.04) 1px, transparent 1px)',
        'radial-keeta':
          'radial-gradient(60% 50% at 50% 0%, rgba(68, 241, 166, 0.18) 0%, rgba(68, 241, 166, 0) 60%)',
        'radial-cyan':
          'radial-gradient(50% 40% at 100% 0%, rgba(90, 215, 255, 0.18) 0%, rgba(90, 215, 255, 0) 60%)',
      },
      backgroundSize: {
        'grid-32': '32px 32px',
      },
      borderRadius: {
        sm: '6px',
        md: '10px',
        lg: '14px',
        xl: '20px',
        '2xl': '28px',
      },
      letterSpacing: {
        tightish: '-0.015em',
      },
      keyframes: {
        'fade-up': {
          '0%': { opacity: '0', transform: 'translateY(8px)' },
          '100%': { opacity: '1', transform: 'translateY(0)' },
        },
        beam: {
          '0%, 100%': { opacity: '0.35' },
          '50%': { opacity: '0.65' },
        },
      },
      animation: {
        'fade-up': 'fade-up 480ms ease-out both',
        beam: 'beam 6s ease-in-out infinite',
      },
    },
  },
  plugins: [],
} satisfies Config;
