import { defineConfig } from 'vitest/config';

export default defineConfig({
  test: {
    fileParallelism: false,
    hookTimeout: 45_000,
    testTimeout: 45_000,
  },
});
