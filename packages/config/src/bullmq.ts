import { QUEUE_NAMES } from './queues.js';

export type QueueName = (typeof QUEUE_NAMES)[keyof typeof QUEUE_NAMES];

const DEFAULT_ATTEMPTS = 5;
const DEFAULT_BACKOFF = { type: 'exponential' as const, delay: 2000 };
const REMOVE_COMPLETE = 1000;
const REMOVE_FAIL = 500;

function timeoutMs(kind: QueueName): number {
  switch (kind) {
    case QUEUE_NAMES.executionProcessing:
      return Number(process.env.JOB_TIMEOUT_MS_EXECUTE ?? 120_000);
    case QUEUE_NAMES.policyEvaluation:
      return Number(process.env.JOB_TIMEOUT_MS_POLICY ?? 60_000);
    case QUEUE_NAMES.routeGeneration:
      return Number(process.env.JOB_TIMEOUT_MS_ROUTE ?? 60_000);
    case QUEUE_NAMES.quoteGeneration:
      return Number(process.env.JOB_TIMEOUT_MS_QUOTE ?? 60_000);
    case QUEUE_NAMES.simulationRuns:
      return Number(process.env.JOB_TIMEOUT_MS_SIMULATION ?? 300_000);
    case QUEUE_NAMES.telemetryFlush:
      return Number(process.env.JOB_TIMEOUT_MS_TELEMETRY ?? 30_000);
    case QUEUE_NAMES.deadLetter:
      return 30_000;
    case QUEUE_NAMES.executionReconciliation:
      return Number(process.env.JOB_TIMEOUT_MS_RECONCILE ?? 120_000);
    case QUEUE_NAMES.anchorBondReconciliation:
      return Number(process.env.JOB_TIMEOUT_MS_ANCHOR_BOND_RECONCILE ?? 120_000);
    case QUEUE_NAMES.anchorOnboarding:
      return Number(process.env.JOB_TIMEOUT_MS_ANCHOR_ONBOARDING ?? 120_000);
    case QUEUE_NAMES.metricsSampler:
      return 60_000;
    case QUEUE_NAMES.stuckJobSweep:
      return 120_000;
    case QUEUE_NAMES.operatorMetricsAggregation:
      return Number(process.env.JOB_TIMEOUT_MS_OPERATOR_METRICS ?? 120_000);
    case QUEUE_NAMES.webhookEventDelivery:
      return Number(process.env.JOB_TIMEOUT_MS_WEBHOOK_DELIVERY ?? 120_000);
    default:
      return 60_000;
  }
}

/** BullMQ `defaultJobOptions` per queue (API `Queue` construction). */
export function getDefaultJobOptions(queueName: QueueName) {
  return {
    attempts: DEFAULT_ATTEMPTS,
    backoff: DEFAULT_BACKOFF,
    removeOnComplete: REMOVE_COMPLETE,
    removeOnFail: REMOVE_FAIL,
    timeout: timeoutMs(queueName),
  };
}

/** Worker-side options aligned with queue timeouts. */
export function getWorkerOptions(queueName: QueueName) {
  return {
    concurrency: queueName === QUEUE_NAMES.telemetryFlush ? 10 : 5,
    lockDuration: Math.min(timeoutMs(queueName) + 30_000, 600_000),
    stalledInterval: 30_000,
    maxStalledCount: 2,
  };
}
