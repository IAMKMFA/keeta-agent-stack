import { defineConfig } from 'tsup';

const external = [
  'react',
  'react-dom',
  'framer-motion',
  '@keeta-agent-stack/ui',
  '@keeta-agent-stack/ui/client',
];

export default defineConfig([
  {
    entry: { index: 'src/index.ts' },
    format: ['esm'],
    dts: true,
    clean: true,
    external,
  },
  {
    entry: { client: 'src/client.ts' },
    format: ['esm'],
    dts: true,
    clean: false,
    external,
    banner: { js: "'use client';" },
  },
]);
