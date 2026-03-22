import Fastify from 'fastify';
import cors from '@fastify/cors';
import { Queue } from 'bullmq';
import Redis from 'ioredis';
import { loadEnv, QUEUE_NAMES } from '@keeta-agent-sdk/config';
import { createDb } from '@keeta-agent-sdk/storage';
import { AdapterRegistry, createDefaultDevAdapters } from '@keeta-agent-sdk/adapter-registry';
import { TelemetryEmitter } from '@keeta-agent-sdk/telemetry';
import { contextPlugin } from './plugins/context.js';
import { healthRoutes } from './routes/health.js';
import { adaptersRoutes } from './routes/adapters.js';
import { walletsRoutes } from './routes/wallets.js';
import { intentsRoutes } from './routes/intents.js';
import { simulationsRoutes } from './routes/simulations.js';

async function main() {
  const env = loadEnv();
  const app = Fastify({ logger: true });

  await app.register(cors, { origin: true });

  const db = createDb(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });

  const registry = new AdapterRegistry();
  for (const a of createDefaultDevAdapters()) {
    registry.register(a);
  }

  const connection = { connection: { url: env.REDIS_URL } };
  const queues: Record<string, Queue> = {
    [QUEUE_NAMES.quoteGeneration]: new Queue(QUEUE_NAMES.quoteGeneration, connection),
    [QUEUE_NAMES.routeGeneration]: new Queue(QUEUE_NAMES.routeGeneration, connection),
    [QUEUE_NAMES.policyEvaluation]: new Queue(QUEUE_NAMES.policyEvaluation, connection),
    [QUEUE_NAMES.executionProcessing]: new Queue(QUEUE_NAMES.executionProcessing, connection),
    [QUEUE_NAMES.simulationRuns]: new Queue(QUEUE_NAMES.simulationRuns, connection),
    [QUEUE_NAMES.telemetryFlush]: new Queue(QUEUE_NAMES.telemetryFlush, connection),
  };

  const telemetry = new TelemetryEmitter(queues[QUEUE_NAMES.telemetryFlush]);

  await app.register(contextPlugin, {
    registry,
    db,
    queues,
    telemetry,
    redis,
  });

  await app.register(healthRoutes);
  await app.register(adaptersRoutes);
  await app.register(walletsRoutes);
  await app.register(intentsRoutes);
  await app.register(simulationsRoutes);

  app.setErrorHandler((err, _req, reply) => {
    app.log.error(err);
    return reply.status(500).send({
      error: { code: 'INTERNAL', message: err.message },
    });
  });

  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
}

main().catch((e) => {
  console.error(e);
  process.exit(1);
});
