import { context, propagation, trace, SpanKind, SpanStatusCode, type Context, type Span } from '@opentelemetry/api';
import { W3CTraceContextPropagator } from '@opentelemetry/core';
import { OTLPTraceExporter } from '@opentelemetry/exporter-trace-otlp-http';
import { Resource } from '@opentelemetry/resources';
import { BatchSpanProcessor, ConsoleSpanExporter, SimpleSpanProcessor } from '@opentelemetry/sdk-trace-base';
import { NodeTracerProvider } from '@opentelemetry/sdk-trace-node';
import { SemanticResourceAttributes } from '@opentelemetry/semantic-conventions';

export type TelemetryAttributeValue = string | number | boolean | undefined;
export type TelemetryAttributes = Record<string, TelemetryAttributeValue>;

export interface TracingInitOptions {
  serviceName: string;
  serviceVersion?: string;
  enabled?: boolean;
  exporterUrl?: string;
  consoleExporter?: boolean;
}

export interface SpanOptions {
  tracerName?: string;
  kind?: 'internal' | 'server' | 'client' | 'producer' | 'consumer';
  attributes?: TelemetryAttributes;
  parentContext?: Context;
  parentTraceparent?: string;
}

export interface TraceMetadata {
  requestId?: string;
  traceparent?: string;
}

export type TraceablePayload<T extends Record<string, unknown>> = T & {
  _telemetry?: TraceMetadata;
};

let provider: NodeTracerProvider | null = null;

function toSpanKind(kind: SpanOptions['kind']): SpanKind {
  switch (kind) {
    case 'server':
      return SpanKind.SERVER;
    case 'client':
      return SpanKind.CLIENT;
    case 'producer':
      return SpanKind.PRODUCER;
    case 'consumer':
      return SpanKind.CONSUMER;
    default:
      return SpanKind.INTERNAL;
  }
}

function cleanAttributes(attributes: TelemetryAttributes | undefined): Record<string, string | number | boolean> | undefined {
  if (!attributes) return undefined;
  const cleaned = Object.fromEntries(
    Object.entries(attributes).filter(([, value]) => value !== undefined)
  ) as Record<string, string | number | boolean>;
  return Object.keys(cleaned).length > 0 ? cleaned : undefined;
}

export function initTracing(options: TracingInitOptions): boolean {
  if (provider) return true;

  const enabled =
    options.enabled === true ||
    options.consoleExporter === true ||
    (typeof options.exporterUrl === 'string' && options.exporterUrl.length > 0);
  if (!enabled) {
    return false;
  }

  provider = new NodeTracerProvider({
    resource: new Resource({
      [SemanticResourceAttributes.SERVICE_NAME]: options.serviceName,
      ...(options.serviceVersion
        ? { [SemanticResourceAttributes.SERVICE_VERSION]: options.serviceVersion }
        : {}),
    }),
  });

  if (options.exporterUrl) {
    provider.addSpanProcessor(
      new BatchSpanProcessor(
        new OTLPTraceExporter({
          url: options.exporterUrl.replace(/\/$/, ''),
        })
      )
    );
  }

  if (options.consoleExporter) {
    provider.addSpanProcessor(new SimpleSpanProcessor(new ConsoleSpanExporter()));
  }

  provider.register();
  propagation.setGlobalPropagator(new W3CTraceContextPropagator());
  return true;
}

export async function shutdownTracing(): Promise<void> {
  if (!provider) return;
  const current = provider;
  provider = null;
  await current.shutdown();
}

export function captureTraceparent(parentContext: Context = context.active()): string | undefined {
  const carrier: Record<string, string> = {};
  propagation.inject(parentContext, carrier);
  return carrier.traceparent;
}

export function extractTraceContext(traceparent?: string | null): Context {
  if (!traceparent) {
    return context.active();
  }
  return propagation.extract(context.active(), { traceparent });
}

export function recordSpanError(span: Span, error: unknown): void {
  if (error instanceof Error) {
    span.recordException(error);
    span.setStatus({ code: SpanStatusCode.ERROR, message: error.message });
    return;
  }
  span.setStatus({ code: SpanStatusCode.ERROR, message: String(error) });
}

export async function withSpan<T>(
  name: string,
  options: SpanOptions,
  fn: (span: Span) => Promise<T> | T
): Promise<T> {
  const tracer = trace.getTracer(options.tracerName ?? 'keeta-agent-sdk');
  const parentContext = options.parentTraceparent
    ? extractTraceContext(options.parentTraceparent)
    : options.parentContext ?? context.active();

  return context.with(parentContext, async () => {
    const span = tracer.startSpan(name, {
      kind: toSpanKind(options.kind),
      attributes: cleanAttributes(options.attributes),
    });
    const spanContext = trace.setSpan(context.active(), span);

    return context.with(spanContext, async () => {
      try {
        const result = await fn(span);
        span.setStatus({ code: SpanStatusCode.OK });
        return result;
      } catch (error) {
        recordSpanError(span, error);
        throw error;
      } finally {
        span.end();
      }
    });
  });
}

export function attachTraceMetadata<T extends Record<string, unknown>>(
  data: T,
  metadata: TraceMetadata = {}
): TraceablePayload<T> {
  const traceparent = metadata.traceparent ?? captureTraceparent();
  const next = {
    ...(metadata.requestId ? { requestId: metadata.requestId } : {}),
    ...(traceparent ? { traceparent } : {}),
  };

  if (Object.keys(next).length === 0) {
    return data;
  }

  return {
    ...data,
    _telemetry: next,
  };
}

export function readTraceMetadata(data: unknown): TraceMetadata {
  if (!data || typeof data !== 'object' || !('_telemetry' in data)) {
    return {};
  }
  const raw = (data as { _telemetry?: unknown })._telemetry;
  if (!raw || typeof raw !== 'object') {
    return {};
  }

  const meta = raw as Record<string, unknown>;
  return {
    requestId: typeof meta.requestId === 'string' ? meta.requestId : undefined,
    traceparent: typeof meta.traceparent === 'string' ? meta.traceparent : undefined,
  };
}
