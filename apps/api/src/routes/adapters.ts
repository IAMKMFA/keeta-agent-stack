import type { FastifyPluginAsync } from 'fastify';

export const adaptersRoutes: FastifyPluginAsync = async (app) => {
  app.get('/adapters', async () => {
    return app.registry.list().map((a) => ({
      id: a.id,
      kind: a.kind,
    }));
  });

  app.get('/adapters/health', async () => {
    return app.registry.healthAll();
  });
};
