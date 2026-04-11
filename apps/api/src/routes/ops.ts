import type { FastifyPluginAsync } from 'fastify';
import { metricsRepo, strategyRepo } from '@keeta-agent-sdk/storage';
import { requireAdminAccess, requireOperatorAccess } from '../lib/auth.js';

export const opsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ops/metrics', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const rows = await metricsRepo.listRecentMetricSamples(app.db, 500);
    return { samples: rows };
  });

  app.post('/ops/strategies/:id/pause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, true);
    return reply.status(204).send();
  });

  app.post('/ops/strategies/:id/unpause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, false);
    return reply.status(204).send();
  });
};
