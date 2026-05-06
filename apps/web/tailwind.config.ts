import type { Config } from 'tailwindcss';

export default {
  content: ['./app/**/*.{ts,tsx}', './components/**/*.{ts,tsx}', './lib/**/*.{ts,tsx}'],
  theme: {
    extend: {
      colors: {
        graphite: '#080b0f',
        panel: '#10161c',
        line: '#21313a',
        keeta: '#44f1a6',
        cyanline: '#5ad7ff',
      },
      boxShadow: {
        glow: '0 0 40px rgba(68, 241, 166, 0.14)',
      },
    },
  },
  plugins: [],
} satisfies Config;
