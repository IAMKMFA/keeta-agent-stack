import type { NextConfig } from 'next';
import path from 'node:path';

const nextConfig: NextConfig = {
  reactStrictMode: true,
  outputFileTracingRoot: path.join(process.cwd(), '../..'),
  transpilePackages: [
    '@keeta-agent-stack/adapter-base',
    '@keeta-agent-stack/adapter-keeta-transfer',
    '@keeta-agent-stack/adapter-mpp',
    '@keeta-agent-stack/adapter-pay-sh',
    '@keeta-agent-stack/adapter-registry',
    '@keeta-agent-stack/adapter-x402',
    '@keeta-agent-stack/policy',
    '@keeta-agent-stack/routing',
    '@keeta-agent-stack/sdk',
    '@keeta-agent-stack/types',
    '@keeta-agent-stack/ui',
    '@keeta-agent-stack/visualizer',
  ],
};

export default nextConfig;
