import { AsyncLocalStorage } from 'node:async_hooks';

export type LogContextValue = string | number | boolean | undefined;
export type LogContext = Record<string, LogContextValue>;

const storage = new AsyncLocalStorage<LogContext>();

function compact(values: LogContext): LogContext {
  return Object.fromEntries(Object.entries(values).filter(([, value]) => value !== undefined));
}

export function withLogContext<T>(values: LogContext, fn: () => T): T {
  const current = storage.getStore() ?? {};
  return storage.run(compact({ ...current, ...values }), fn);
}

export function getLogContext(): LogContext {
  return storage.getStore() ?? {};
}
