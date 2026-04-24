import type { FastifyPluginAsync } from 'fastify';
import { strategyRepo } from '@keeta-agent-stack/storage';
import { requireViewerAccess } from '../lib/auth.js';

export const templatesRoutes: FastifyPluginAsync = async (app) => {
  app.get('/strategy-templates', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return strategyRepo.listTemplates(app.db);
  });
};
