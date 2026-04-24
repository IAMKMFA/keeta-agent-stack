import type { FastifyPluginAsync } from 'fastify';
import { routeRepo } from '@keeta-agent-stack/storage';
import { requireViewerAccess } from '../lib/auth.js';

export const routesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/routes', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const rows = await routeRepo.listRoutePlans(app.db, 200);
    return rows.map((row) => ({
      id: row.id,
      intentId: row.intentId,
      score: row.score,
      payload: row.payload,
      createdAt: row.createdAt,
    }));
  });
};
