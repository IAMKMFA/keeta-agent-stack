export { getLogContext, withLogContext, type LogContext, type LogContextValue } from './context.js';
export { createLogger } from './logger.js';
export { TelemetryEmitter, type TelemetryEventInput } from './emitter.js';
export {
  attachTraceMetadata,
  captureTraceparent,
  extractTraceContext,
  initTracing,
  readTraceMetadata,
  recordSpanError,
  shutdownTracing,
  withSpan,
  type SpanOptions,
  type TelemetryAttributes,
  type TelemetryAttributeValue,
  type TraceMetadata,
  type TraceablePayload,
  type TracingInitOptions,
} from './tracing.js';
