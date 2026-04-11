import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  /** Monorepo root when `next build` runs from `apps/dashboard` */
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
};

export default nextConfig;
