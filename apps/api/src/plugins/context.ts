import fp from 'fastify-plugin';
import type { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import type { AppEnv } from '@keeta-agent-stack/config';
import type { Database } from '@keeta-agent-stack/storage';
import type { Queue } from 'bullmq';
import type { TelemetryEmitter } from '@keeta-agent-stack/telemetry';
import { Redis as RedisClass } from 'ioredis';

type RedisConnection = InstanceType<typeof RedisClass>;

declare module 'fastify' {
  interface FastifyInstance {
    registry: AdapterRegistry;
    db: Database;
    queues: Record<string, Queue>;
    telemetry: TelemetryEmitter;
    redis: RedisConnection;
    env: AppEnv;
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
      redis: RedisConnection;
      env: AppEnv;
    }
  ) => {
    app.decorate('registry', opts.registry);
    app.decorate('db', opts.db);
    app.decorate('queues', opts.queues);
    app.decorate('telemetry', opts.telemetry);
    app.decorate('redis', opts.redis);
    app.decorate('env', opts.env);
  }
);
