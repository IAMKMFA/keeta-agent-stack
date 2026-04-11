export const QUEUE_NAMES = {
  quoteGeneration: 'quote-generation',
  routeGeneration: 'route-generation',
  policyEvaluation: 'policy-evaluation',
  executionProcessing: 'execution-processing',
  simulationRuns: 'simulation-runs',
  telemetryFlush: 'telemetry-flush',
  /** Final resting place for jobs that exhausted retries (processor logs + DB row). */
  deadLetter: 'dead-letter',
  /** Periodic reconciliation of submitted/unknown settlements. */
  executionReconciliation: 'execution-reconciliation',
  /** Periodic verification + normalization of payment anchor bond posture. */
  anchorBondReconciliation: 'anchor-bond-reconciliation',
  /** Worker-driven anchor onboarding progression. */
  anchorOnboarding: 'anchor-onboarding',
  /** Sample queue depths / failure signals into metric_samples. */
  metricsSampler: 'metrics-sampler',
  /** Find stale active/waiting jobs and emit telemetry. */
  stuckJobSweep: 'stuck-job-sweep',
  /** Aggregate per-operator execution outcomes into metric_samples for dynamic routing. */
  operatorMetricsAggregation: 'operator-metrics-aggregation',
  /** Fan out audit events to webhook subscribers and retry failed deliveries. */
  webhookEventDelivery: 'webhook-event-delivery',
} as const;
