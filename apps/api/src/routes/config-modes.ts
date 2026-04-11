import type { FastifyPluginAsync } from 'fastify';
import { requireViewerAccess } from '../lib/auth.js';

export const configModesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/config/modes', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return {
      liveMode: app.env.LIVE_MODE_ENABLED === true,
      keetaNetwork: app.env.KEETA_NETWORK,
      mockAdapters: process.env.MOCK_ADAPTERS === 'true' || process.env.MOCK_ADAPTERS === '1',
      executionKillSwitch: app.env.EXECUTION_KILL_SWITCH === true,
    };
  });
};
