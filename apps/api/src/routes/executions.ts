import type { FastifyPluginAsync } from 'fastify';
import { executionRepo } from '@keeta-agent-sdk/storage';
import { requireViewerAccess } from '../lib/auth.js';

export const executionsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/executions', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return executionRepo.listExecutions(app.db, 200);
  });
};
