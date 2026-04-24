import type { FastifyPluginAsync } from 'fastify';
import { readChainHealth, readNetworkInfo, createReadOnlyUserClient } from '@keeta-agent-stack/keeta';
import { requireViewerAccess } from '../lib/auth.js';

export const chainRoutes: FastifyPluginAsync = async (app) => {
  app.get('/chain/health', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const network = app.env.KEETA_NETWORK;
    const started = performance.now();
    const health = await readChainHealth(network);
    let networkInfo: { baseToken: string; networkAddress: string } | null = null;
    try {
      const uc = createReadOnlyUserClient(app.env);
      networkInfo = await readNetworkInfo(uc);
      await uc.destroy();
    } catch {
      networkInfo = null;
    }
    return {
      ...health,
      apiLatencyMs: Math.round(performance.now() - started),
      networkInfo,
    };
  });
};
