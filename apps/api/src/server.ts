import path from 'node:path';
import { randomUUID } from 'node:crypto';
import { fileURLToPath } from 'node:url';
import Fastify, { type FastifyInstance } from 'fastify';
import cors from '@fastify/cors';
import rateLimit from '@fastify/rate-limit';
import swagger from '@fastify/swagger';
import swaggerUi from '@fastify/swagger-ui';
import { Queue } from 'bullmq';
import { Redis } from 'ioredis';
import { loadEnv, QUEUE_NAMES, getDefaultJobOptions, type AppEnv } from '@keeta-agent-stack/config';
import { createDb } from '@keeta-agent-stack/storage';
import { createDefaultDevRegistry, type AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { initTracing, shutdownTracing, TelemetryEmitter } from '@keeta-agent-stack/telemetry';
import { contextPlugin } from './plugins/context.js';
import { healthRoutes } from './routes/health.js';
import { adaptersRoutes } from './routes/adapters.js';
import { walletsRoutes } from './routes/wallets.js';
import { intentsRoutes } from './routes/intents.js';
import { simulationsRoutes } from './routes/simulations.js';
import { chainRoutes } from './routes/chain.js';
import { executionsRoutes } from './routes/executions.js';
import { templatesRoutes } from './routes/templates.js';
import { opsRoutes } from './routes/ops.js';
import { configModesRoutes } from './routes/config-modes.js';
import { policyAdminRoutes } from './routes/policy-admin.js';
import { oracleRoutes } from './routes/oracle.js';
import { routesRoutes } from './routes/routes.js';
import { anchorsRoutes } from './routes/anchors.js';
import { eventsRoutes } from './routes/events.js';
import { openApiRoutes } from './routes/openapi.js';
import { buildOpenApiDocument } from './openapi.js';
import { webhooksRoutes } from './routes/webhooks.js';
import { metricsRoutes } from './routes/metrics.js';
import { meRoutes } from './routes/me.js';
import { railsRoutes } from './routes/rails.js';
import { feesRoutes } from './routes/fees.js';
import { createApiMetricsCollector } from './lib/metrics.js';

const API_QUEUE_NAMES = [
  QUEUE_NAMES.quoteGeneration,
  QUEUE_NAMES.routeGeneration,
  QUEUE_NAMES.policyEvaluation,
  QUEUE_NAMES.executionProcessing,
  QUEUE_NAMES.simulationRuns,
  QUEUE_NAMES.telemetryFlush,
  QUEUE_NAMES.deadLetter,
  QUEUE_NAMES.executionReconciliation,
  QUEUE_NAMES.anchorBondReconciliation,
  QUEUE_NAMES.anchorOnboarding,
  QUEUE_NAMES.metricsSampler,
  QUEUE_NAMES.stuckJobSweep,
  QUEUE_NAMES.webhookEventDelivery,
  QUEUE_NAMES.operatorMetricsAggregation,
] as const;

export interface BuildApiAppOptions {
  env?: AppEnv;
  registry?: AdapterRegistry;
}

export async function buildApiApp(options: BuildApiAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  initTracing({
    serviceName: env.OTEL_SERVICE_NAME ?? 'keeta-agent-api',
    enabled: env.OTEL_ENABLED,
    consoleExporter: env.OTEL_CONSOLE_EXPORTER,
    exporterUrl: env.OTEL_EXPORTER_OTLP_ENDPOINT,
  });

  const app = Fastify({
    logger: true,
    requestIdHeader: 'x-request-id',
    requestIdLogLabel: 'requestId',
    genReqId(req) {
      const header = req.headers['x-request-id'];
      if (typeof header === 'string' && header.length > 0) {
        return header;
      }
      if (Array.isArray(header) && typeof header[0] === 'string' && header[0].length > 0) {
        return header[0];
      }
      return randomUUID();
    },
  });

  const corsOrigin =
    env.API_CORS_ORIGINS.length > 0
      ? env.API_CORS_ORIGINS
      : env.NODE_ENV === 'production'
        ? false
        : true;
  const swaggerTryItOutEnabled = env.API_SWAGGER_TRY_IT_OUT_ENABLED ?? env.NODE_ENV !== 'production';

  await app.register(cors, { origin: corsOrigin });
  await app.register(rateLimit, {
    global: true,
    max: env.API_RATE_LIMIT_MAX,
    timeWindow: env.API_RATE_LIMIT_WINDOW_MS,
    allowList: env.API_RATE_LIMIT_ALLOWLIST,
    errorResponseBuilder: (_req, context) => ({
      statusCode: 429,
      error: {
        code: 'RATE_LIMITED',
        message: `Rate limit exceeded. Retry in ${context.after}.`,
      },
    }),
  });

  app.addHook('onRequest', async (req, reply) => {
    req.metricsStartedAt = process.hrtime.bigint();
    reply.header('x-request-id', req.id);
  });

  const db = createDb(env.DATABASE_URL);
  const redis = new Redis(env.REDIS_URL, { maxRetriesPerRequest: null });
  const registry = options.registry ?? createDefaultDevRegistry();

  const connection = { connection: { url: env.REDIS_URL } };
  const queues = Object.fromEntries(
    API_QUEUE_NAMES.map((queueName) => [
      queueName,
      new Queue(queueName, {
        ...connection,
        defaultJobOptions: getDefaultJobOptions(queueName),
      }),
    ])
  ) as Record<string, Queue>;

  const telemetry = new TelemetryEmitter(queues[QUEUE_NAMES.telemetryFlush]!);
  const metrics = createApiMetricsCollector({ db, env, queues });

  app.decorate('metrics', metrics);

  app.addHook('onResponse', async (req, reply) => {
    app.metrics.observeRequest(req, reply);
  });

  app.addHook('onClose', async () => {
    for (const queue of Object.values(queues)) {
      await queue.close();
    }
    await redis.quit();
    await db.pool.end();
    await shutdownTracing();
  });

  await app.register(contextPlugin, {
    registry,
    db,
    queues,
    telemetry,
    redis,
    env,
  });

  await app.register(healthRoutes);
  await app.register(adaptersRoutes);
  await app.register(walletsRoutes);
  await app.register(intentsRoutes);
  await app.register(simulationsRoutes);
  await app.register(routesRoutes);

  await app.register(chainRoutes);
  await app.register(executionsRoutes);
  await app.register(templatesRoutes);
  await app.register(opsRoutes);
  await app.register(configModesRoutes);
  await app.register(policyAdminRoutes);
  await app.register(oracleRoutes);
  await app.register(anchorsRoutes);
  await app.register(eventsRoutes);
  await app.register(openApiRoutes);

  await app.register(swagger, {
    // The generated document is valid at runtime, but @fastify/swagger's type
    // surface is narrower than our hand-built OpenAPI 3.1 helper.
    openapi: buildOpenApiDocument({ serverUrl: env.API_URL ?? `http://localhost:${env.API_PORT}` }) as never,
  });
  await app.register(swaggerUi, {
    routePrefix: '/docs',
    transformSpecification: (_swaggerObject, req) =>
      buildOpenApiDocument({
        serverUrl:
          app.env.API_URL ??
          (typeof req.headers.host === 'string'
            ? `${req.protocol}://${req.headers.host}`
            : `http://localhost:${app.env.API_PORT}`),
      }),
    uiConfig: {
      docExpansion: 'list',
      deepLinking: true,
      tryItOutEnabled: swaggerTryItOutEnabled,
    },
    staticCSP: true,
  });
  await app.register(webhooksRoutes);
  await app.register(meRoutes);
  await app.register(railsRoutes);
  await app.register(feesRoutes);
  if (env.METRICS_ENABLED) {
    await app.register(metricsRoutes);
  }

  app.setErrorHandler((err, req, reply) => {
    const statusCode = err && typeof err === 'object' && 'error' in err && err.error && typeof err.error === 'object'
      && 'code' in err.error && err.error.code === 'RATE_LIMITED'
        ? 429
        : typeof (err as { statusCode?: unknown }).statusCode === 'number'
        ? (err as { statusCode: number }).statusCode
        : 500;

    if (statusCode >= 500) {
      app.log.error(err);
    } else {
      app.log.warn(err);
    }

    if (statusCode >= 500 && env.NODE_ENV === 'production') {
      return reply.status(statusCode).send({
        error: {
          code: 'INTERNAL',
          message: 'Internal server error',
          requestId: req.id,
        },
      });
    }

    if (
      err &&
      typeof err === 'object' &&
      'error' in err &&
      err.error &&
      typeof err.error === 'object'
    ) {
      return reply.status(statusCode).send(err);
    }

    const message = err instanceof Error ? err.message : String(err);
    return reply.status(statusCode).send({
      error: { code: statusCode === 429 ? 'RATE_LIMITED' : 'INTERNAL', message, requestId: req.id },
    });
  });

  return app;
}

export async function startApiServer(options: BuildApiAppOptions = {}): Promise<FastifyInstance> {
  const env = options.env ?? loadEnv();
  const app = await buildApiApp({ ...options, env });
  await app.listen({ port: env.API_PORT, host: '0.0.0.0' });
  return app;
}

async function main() {
  const app = await startApiServer();
  const stop = async () => {
    try {
      await app.close();
    } catch (error) {
      console.error(error);
    }
    process.exit(0);
  };

  process.on('SIGINT', () => void stop());
  process.on('SIGTERM', () => void stop());
}

const isDirectRun = process.argv[1]
  ? path.resolve(process.argv[1]) === fileURLToPath(import.meta.url)
  : false;

if (isDirectRun) {
  main().catch((error) => {
    console.error(error);
    process.exit(1);
  });
}
