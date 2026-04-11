import type { Queue } from 'bullmq';
import type { FastifyReply, FastifyRequest } from 'fastify';
import { collectDefaultMetrics, Counter, Gauge, Histogram, Registry } from 'prom-client';
import { executionRepo, metricsRepo, type Database, webhookRepo } from '@keeta-agent-sdk/storage';
import type { AppEnv } from '@keeta-agent-sdk/config';

declare module 'fastify' {
  interface FastifyInstance {
    metrics: ApiMetricsCollector;
  }

  interface FastifyRequest {
    metricsStartedAt?: bigint;
  }
}

export interface ApiMetricsCollector {
  contentType: string;
  observeRequest: (req: FastifyRequest, reply: FastifyReply) => void;
  scrape: () => Promise<string>;
}

function routeLabel(req: FastifyRequest): string {
  const routePath =
    (req.routeOptions && 'url' in req.routeOptions ? req.routeOptions.url : undefined) ??
    req.url.split('?')[0] ??
    'unknown';
  return typeof routePath === 'string' && routePath.length > 0 ? routePath : 'unknown';
}

function secondsFromStart(startedAt?: bigint): number {
  if (!startedAt) return 0;
  const durationNs = process.hrtime.bigint() - startedAt;
  return Number(durationNs) / 1_000_000_000;
}

export function createApiMetricsCollector(options: {
  db: Database;
  env: AppEnv;
  queues: Record<string, Queue>;
}): ApiMetricsCollector {
  const registry = new Registry();
  collectDefaultMetrics({ register: registry, prefix: 'keeta_api_' });

  const requestCounter = new Counter({
    name: 'keeta_api_http_requests_total',
    help: 'Total API requests processed by the Keeta Agent API',
    labelNames: ['method', 'route', 'status_code'] as const,
    registers: [registry],
  });

  const requestDuration = new Histogram({
    name: 'keeta_api_http_request_duration_seconds',
    help: 'API request duration in seconds',
    labelNames: ['method', 'route', 'status_code'] as const,
    buckets: [0.005, 0.01, 0.025, 0.05, 0.1, 0.25, 0.5, 1, 2, 5, 10],
    registers: [registry],
  });

  const queueDepthGauge = new Gauge({
    name: 'keeta_queue_depth',
    help: 'Current queue depth by queue name',
    labelNames: ['queue'] as const,
    registers: [registry],
  });

  const queueFailedGauge = new Gauge({
    name: 'keeta_queue_failed_jobs',
    help: 'Current failed job count by queue name',
    labelNames: ['queue'] as const,
    registers: [registry],
  });

  const executionLatencyGauge = new Gauge({
    name: 'keeta_execution_latency_ms',
    help: 'Execution latency snapshot in milliseconds over the last 24 hours',
    labelNames: ['statistic'] as const,
    registers: [registry],
  });

  const unsettledExecutionsGauge = new Gauge({
    name: 'keeta_unsettled_executions_total',
    help: 'Current count of unsettled executions',
    registers: [registry],
  });

  const policyRejectionGauge = new Gauge({
    name: 'keeta_policy_rejections_24h_total',
    help: 'Policy rejections observed over the last 24 hours',
    registers: [registry],
  });

  const webhookDeliveriesGauge = new Gauge({
    name: 'keeta_webhook_deliveries_total',
    help: 'Webhook deliveries by status over the last 24 hours',
    labelNames: ['status'] as const,
    registers: [registry],
  });

  async function refreshRuntimeMetrics() {
    queueDepthGauge.reset();
    queueFailedGauge.reset();
    executionLatencyGauge.reset();
    webhookDeliveriesGauge.reset();

    const since = new Date(Date.now() - 24 * 60 * 60 * 1000);
    const [queueCounts, latencySnapshot, unsettledExecutions, policyRejections, webhookCounts] =
      await Promise.all([
        Promise.all(
          Object.values(options.queues).map(async (queue) => {
            const counts = await queue.getJobCounts();
            return { queueName: queue.name, counts };
          })
        ),
        executionRepo.getExecutionLatencySnapshot(options.db, since),
        executionRepo.countUnsettledExecutions(options.db),
        metricsRepo.countMetricSamples(options.db, 'metric.policy_rejection', { since }),
        webhookRepo.countWebhookDeliveriesByStatus(options.db, { since }),
      ]);

    for (const { queueName, counts } of queueCounts) {
      const depth = (counts.waiting ?? 0) + (counts.active ?? 0) + (counts.delayed ?? 0);
      queueDepthGauge.set({ queue: queueName }, depth);
      queueFailedGauge.set({ queue: queueName }, counts.failed ?? 0);
    }

    unsettledExecutionsGauge.set(unsettledExecutions);
    policyRejectionGauge.set(policyRejections);

    if (latencySnapshot.avgLatencyMs !== null) {
      executionLatencyGauge.set({ statistic: 'avg' }, latencySnapshot.avgLatencyMs);
    }
    if (latencySnapshot.p50LatencyMs !== null) {
      executionLatencyGauge.set({ statistic: 'p50' }, latencySnapshot.p50LatencyMs);
    }
    if (latencySnapshot.p95LatencyMs !== null) {
      executionLatencyGauge.set({ statistic: 'p95' }, latencySnapshot.p95LatencyMs);
    }

    for (const row of webhookCounts) {
      webhookDeliveriesGauge.set({ status: row.status }, row.count);
    }
  }

  return {
    contentType: registry.contentType,
    observeRequest(req, reply) {
      const labels = {
        method: req.method,
        route: routeLabel(req),
        status_code: String(reply.statusCode),
      };
      requestCounter.inc(labels, 1);
      requestDuration.observe(labels, secondsFromStart(req.metricsStartedAt));
    },
    async scrape() {
      await refreshRuntimeMetrics();
      return registry.metrics();
    },
  };
}
