import type { FastifyPluginAsync } from 'fastify';
import { sql } from 'drizzle-orm';

export const healthRoutes: FastifyPluginAsync = async (app) => {
  app.get('/health', async (_req, reply) => {
    try {
      await app.db.execute(sql`select 1`);
      const pong = await app.redis.ping();
      return reply.send({ ok: true, db: true, redis: pong === 'PONG' });
    } catch (e) {
      app.log.error(e);
      return reply.status(503).send({
        error: { code: 'UNHEALTHY', message: 'Service unavailable' },
      });
    }
  });
};
