import type { FastifyPluginAsync } from 'fastify';
import { requireOperatorAccess } from '../lib/auth.js';

export const metricsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/metrics', async (req, reply) => {
    if (app.env.METRICS_REQUIRE_AUTH && !(await requireOperatorAccess(app, req, reply))) {
      return;
    }

    const body = await app.metrics.scrape();
    reply.header('content-type', app.metrics.contentType);
    return reply.send(body);
  });
};
