import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { getLogContext } from './context.js';

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    mixin() {
      const spanContext = trace.getActiveSpan()?.spanContext();
      return {
        ...getLogContext(),
        ...(spanContext
          ? {
              traceId: spanContext.traceId,
              spanId: spanContext.spanId,
            }
          : {}),
      };
    },
  });
}
