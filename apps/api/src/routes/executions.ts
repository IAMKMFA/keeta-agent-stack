import type { FastifyPluginAsync } from 'fastify';
import { ExecutionResultSchema } from '@keeta-agent-sdk/types';
import { executionRepo } from '@keeta-agent-sdk/storage';
import { requireViewerAccess } from '../lib/auth.js';

export const executionsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/executions', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const rows = await executionRepo.listExecutions(app.db, 200);
    return rows.map((row) => ({
      ...row,
      payload: ExecutionResultSchema.parse(row.payload),
    }));
  });
};
