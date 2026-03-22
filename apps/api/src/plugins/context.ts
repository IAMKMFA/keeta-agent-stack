import fp from 'fastify-plugin';
import type { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import type { Database } from '@keeta-agent-sdk/storage';
import type { Queue } from 'bullmq';
import type { TelemetryEmitter } from '@keeta-agent-sdk/telemetry';
import type Redis from 'ioredis';

declare module 'fastify' {
  interface FastifyInstance {
    registry: AdapterRegistry;
    db: Database;
    queues: Record<string, Queue>;
    telemetry: TelemetryEmitter;
    redis: Redis;
  }
}

export const contextPlugin = fp(
  async (
    app,
    opts: {
      registry: AdapterRegistry;
      db: Database;
      queues: Record<string, Queue>;
      telemetry: TelemetryEmitter;
      redis: Redis;
    }
  ) => {
    app.decorate('registry', opts.registry);
    app.decorate('db', opts.db);
    app.decorate('queues', opts.queues);
    app.decorate('telemetry', opts.telemetry);
    app.decorate('redis', opts.redis);
  }
);
