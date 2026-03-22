import type { ExecutionResult, QuoteResponse } from '@keeta-agent-sdk/types';

export type AdapterOk<T> = { success: true; data: T };
export type AdapterErr = { success: false; code: string; message: string };
export type AdapterResult<T> = AdapterOk<T> | AdapterErr;

export function ok<T>(data: T): AdapterOk<T> {
  return { success: true, data };
}

export function err(code: string, message: string): AdapterErr {
  return { success: false, code, message };
}

export type QuoteAdapterResult = AdapterResult<QuoteResponse>;
export type ExecuteAdapterResult = AdapterResult<ExecutionResult>;
