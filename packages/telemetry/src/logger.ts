import pino from 'pino';
import { trace } from '@opentelemetry/api';
import { getLogContext } from './context.js';

/**
 * Pino field paths that should never appear in logs. Combines common secret-carrying field
 * names with Keeta-specific seed/keys. Extend via `TELEMETRY_EXTRA_REDACT_PATHS` env var
 * (comma-separated pino paths).
 *
 * pino path syntax reference: https://github.com/pinojs/pino/blob/main/docs/redaction.md
 */
const DEFAULT_REDACT_PATHS = [
  'password',
  'seed',
  'mnemonic',
  'privateKey',
  'private_key',
  'secret',
  'apiKey',
  'apiSecret',
  'token',
  'sessionToken',
  'authorization',
  'headers.authorization',
  'headers["x-ops-key"]',
  'headers["x-admin-token"]',
  'req.headers.authorization',
  'req.headers["x-ops-key"]',
  'req.headers["x-admin-token"]',
  'res.headers.authorization',
  'KEETA_SIGNING_SEED',
  'signingSeed',
  'signing_seed',
  'keetaSeed',
  'ADMIN_BYPASS_TOKEN',
  'OPS_API_KEY',
  'AUTH_JWT_SECRET',
  'WEBHOOK_SECRET',
  'webhookSecret',
  'env.KEETA_SIGNING_SEED',
  'env.ADMIN_BYPASS_TOKEN',
  'env.OPS_API_KEY',
  'env.AUTH_JWT_SECRET',
  'body.seed',
  'body.signingSeed',
  'args.seed',
  '*.seed',
  '*.signingSeed',
  '*.apiKey',
  '*.secret',
];

function parseExtraRedactPaths(value: string | undefined): string[] {
  if (!value) return [];
  return value
    .split(',')
    .map((entry) => entry.trim())
    .filter(Boolean);
}

export function getRedactPaths(): string[] {
  const extra = parseExtraRedactPaths(process.env.TELEMETRY_EXTRA_REDACT_PATHS);
  return [...new Set([...DEFAULT_REDACT_PATHS, ...extra])];
}

export function createLogger(name: string) {
  return pino({
    name,
    level: process.env.LOG_LEVEL ?? 'info',
    redact: {
      paths: getRedactPaths(),
      censor: '[REDACTED]',
    },
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
