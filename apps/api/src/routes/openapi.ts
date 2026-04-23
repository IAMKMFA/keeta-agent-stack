import type { FastifyPluginAsync } from 'fastify';
import { buildOpenApiDocument } from '../openapi.js';

export const openApiRoutes: FastifyPluginAsync = async (app) => {
  app.get('/openapi.json', async (req, reply) => {
    const serverUrl =
      app.env.API_URL ??
      (typeof req.headers.host === 'string' ? `${req.protocol}://${req.headers.host}` : 'http://localhost:3001');
    reply.header('cache-control', 'public, max-age=300');
    return reply.send(buildOpenApiDocument({ serverUrl }));
  });
};
