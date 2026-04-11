import type { FastifyPluginAsync } from 'fastify';
import { requireViewerAccess } from '../lib/auth.js';

export const adaptersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/adapters', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return app.registry.list().map((a) => ({
      id: a.id,
      kind: a.kind,
    }));
  });

  app.get('/adapters/health', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return app.registry.healthAll();
  });
};
