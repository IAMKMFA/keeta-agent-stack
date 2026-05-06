import { defineConfig } from 'tsup';

const external = ['react', 'react-dom', 'lucide-react'];

export default defineConfig([
  {
    entry: {
      index: 'src/index.ts',
      'tokens/index': 'src/tokens/index.ts',
    },
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
