/**
 * Shared MCP response envelope.
 *
 * Every tool in this server returns one of two shapes serialized as text/JSON:
 *
 *   { ok: true,  data: ... }
 *   { ok: false, error: { code, message, retryable, hint? } }
 *
 * Keeping the shape uniform means LLM hosts (Grok, Claude, LangGraph, etc.)
 * can ship a single response handler instead of one per tool.
 */

import { KtaOracleRequestError } from '@keeta-agent-stack/keeta';

export interface McpErrorEnvelope {
  ok: false;
  error: {
    code: string;
    message: string;
    retryable: boolean;
    hint?: string;
    details?: unknown;
  };
}

export interface McpOkEnvelope<T = unknown> {
  ok: true;
  data: T;
}

export type McpEnvelope<T = unknown> = McpOkEnvelope<T> | McpErrorEnvelope;

export interface McpToolResponse {
  content: Array<{ type: 'text'; text: string }>;
  [k: string]: unknown;
}

export function envelope<T>(payload: McpEnvelope<T>): McpToolResponse {
  return {
    content: [{ type: 'text', text: JSON.stringify(payload, null, 2) }],
  };
}

export function ok<T>(data: T): McpToolResponse {
  return envelope<T>({ ok: true, data });
}

export interface ErrorOpts {
  retryable?: boolean;
  hint?: string;
  details?: unknown;
}

export function errResp(code: string, message: string, opts: ErrorOpts = {}): McpToolResponse {
  return envelope({
    ok: false,
    error: {
      code,
      message,
      retryable: opts.retryable ?? false,
      ...(opts.hint ? { hint: opts.hint } : {}),
      ...(opts.details !== undefined ? { details: opts.details } : {}),
    },
  });
}

/**
 * Map an unknown thrown value into the standard error envelope. Adds an
 * `Oracle`-specific hint when the underlying cause is a `KtaOracleRequestError`.
 */
export function fromError(error: unknown, fallbackCode = 'INTERNAL_ERROR'): McpToolResponse {
  if (error instanceof KtaOracleRequestError) {
    const status = error.status ?? 0;
    return errResp(`ORACLE_HTTP_${status || 'ERROR'}`, error.message, {
      retryable: status >= 500 || status === 429,
      hint:
        status === 429
          ? 'Rate-limited by KTA Oracle. Back off, then retry.'
          : status >= 500
            ? 'Upstream Oracle is degraded. Retry with exponential backoff.'
            : undefined,
      details: { endpoint: error.endpoint, body: error.body },
    });
  }
  if (error instanceof Error) {
    return errResp(fallbackCode, error.message, { retryable: false });
  }
  return errResp(fallbackCode, String(error), { retryable: false });
}
