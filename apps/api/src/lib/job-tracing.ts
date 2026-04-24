import type { FastifyRequest } from 'fastify';
import type { JobsOptions, Queue } from 'bullmq';
import {
  attachTraceMetadata,
  withLogContext,
  withSpan,
  type TelemetryAttributes,
  type TraceablePayload,
} from '@keeta-agent-stack/telemetry';

export function withRequestTelemetry<T extends Record<string, unknown>>(
  req: FastifyRequest,
  data: T
): TraceablePayload<T> {
  return attachTraceMetadata(data, { requestId: req.id });
}

export async function enqueueJobWithTelemetry<T extends Record<string, unknown>>(
  req: FastifyRequest,
  options: {
    queue: Queue;
    jobName: string;
    data: T;
    jobOptions?: JobsOptions;
    spanName: string;
    attributes?: TelemetryAttributes;
  }
) {
  return withLogContext({ requestId: req.id, queueName: options.queue.name }, () =>
    withSpan(
      options.spanName,
      {
        tracerName: 'keeta-agent-api',
        kind: 'producer',
        attributes: {
          'request.id': req.id,
          'queue.name': options.queue.name,
          ...options.attributes,
        },
      },
      async () => options.queue.add(options.jobName, withRequestTelemetry(req, options.data), options.jobOptions)
    )
  );
}
