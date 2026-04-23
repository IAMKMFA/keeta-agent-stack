/**
 * Oracle Payment Playbook tools.
 *
 * Companion to the long-form `examples/oracle-payment-playbook` script. These
 * MCP tools expose a tight, LLM-friendly API surface for an agent to:
 *
 *   1. preview a payment (rates, rails, instructions) before committing
 *   2. execute it once the user confirms (idempotent on correlationId)
 *   3. inspect the agent's open subscriptions (oracle.subscription.list)
 *   4. replay a previous run (operator-gated; requires OPS_API_KEY)
 *
 * Every response uses the shared envelope from `./error-envelope.ts`.
 */

import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KtaOracleClient, buildOraclePaymentPlaybook } from '@keeta-agent-sdk/keeta';
import { errResp, fromError, ok } from './error-envelope.js';

const DEFAULT_TIMEOUT_MS = 10_000;

function getOracleClient(): KtaOracleClient {
  const timeoutRaw = process.env.KTA_ORACLE_TIMEOUT_MS;
  const timeout = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  return new KtaOracleClient({
    baseUrl: process.env.KTA_ORACLE_BASE_URL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  });
}

const PreviewSchema = z
  .object({
    amount: z.number().positive().describe('Amount to send, denominated in `currency`.'),
    currency: z.string().min(1).describe("ISO-4217 currency code, e.g. 'USD', 'EUR'."),
    walletAddress: z.string().optional().describe('Optional sender wallet (keeta_ address) for tier-aware pricing.'),
    recipientWallet: z.string().optional().describe('Optional recipient wallet (keeta_ address).'),
    compareFrom: z
      .enum(['swift', 'bankwire', 'stripe', 'visa', 'all'])
      .optional()
      .describe('Which legacy rail(s) to compare against.'),
    complianceRegion: z.string().optional().describe('Optional ISO country code for compliance hints.'),
    network: z.enum(['main', 'test']).default('test'),
  })
  .strict();

const ExecuteSchema = z
  .object({
    correlationId: z
      .string()
      .min(8)
      .describe(
        'Idempotency key. Identical correlationIds return the same response without re-executing.'
      ),
    intentId: z.string().uuid().describe('Persisted intent id (`oracle.payment.preview` returns one).'),
    confirmation: z.literal('CONFIRM').describe('Operator must literally pass "CONFIRM" to proceed.'),
  })
  .strict();

const SubscriptionListSchema = z
  .object({
    walletAddress: z.string().optional().describe('Filter by sender wallet.'),
    status: z.enum(['active', 'paused', 'all']).default('active'),
  })
  .strict();

const ReplaySchema = z
  .object({
    correlationId: z.string().min(8).describe('Identifier of the previous oracle.payment.execute run.'),
    reason: z.string().min(8).describe('Operator audit trail reason.'),
  })
  .strict();

const idempotencyCache = new Map<string, unknown>();

export function registerOraclePaymentTools(server: McpServer): void {
  server.tool(
    'oracle.payment.preview',
    [
      'Preview a fiat → KTA payment.',
      'Use BEFORE oracle.payment.execute. Returns rates, rails, and execution instructions; never moves funds.',
      'Do NOT use for crypto-only swaps — call keeta_create_intent + keeta_quote_intent instead.',
    ].join(' '),
    PreviewSchema.shape,
    async (raw) => {
      const parsed = PreviewSchema.safeParse(raw);
      if (!parsed.success) {
        return errResp('INVALID_ARGUMENTS', 'Argument validation failed', {
          details: parsed.error.flatten(),
          retryable: false,
          hint: 'Check the tool schema and re-issue with the missing/typed fields.',
        });
      }

      try {
        const playbook = await buildOraclePaymentPlaybook(getOracleClient(), {
          ...parsed.data,
          includeSdkSnippet: true,
        });
        return ok({
          source: 'kta-oracle',
          preview: playbook,
        });
      } catch (error) {
        return fromError(error, 'PREVIEW_FAILED');
      }
    }
  );

  server.tool(
    'oracle.payment.execute',
    [
      'Execute a previously-previewed payment.',
      'IDEMPOTENT on correlationId — safe to retry on transient failures.',
      'Requires the operator to pass confirmation: "CONFIRM" exactly.',
      'Use ONLY after oracle.payment.preview has been shown to the user.',
    ].join(' '),
    ExecuteSchema.shape,
    async (raw) => {
      const parsed = ExecuteSchema.safeParse(raw);
      if (!parsed.success) {
        return errResp('INVALID_ARGUMENTS', 'Argument validation failed', {
          details: parsed.error.flatten(),
          retryable: false,
        });
      }

      const cached = idempotencyCache.get(parsed.data.correlationId);
      if (cached) {
        return ok({ idempotent: true, ...((cached as object) ?? {}) });
      }

      // We don't yet have a backend `oracle.payment.execute` endpoint. Returning
      // 501 surfaces the contract while keeping the LLM-side guardrails (schema,
      // confirmation, idempotency) live. When the backend lands, replace this
      // stub with the real call and remove the placeholder envelope.
      const placeholder = {
        status: 'pending_backend',
        intentId: parsed.data.intentId,
        correlationId: parsed.data.correlationId,
        message:
          'Dashboard/MCP guardrails enforced. Backend execution endpoint not yet wired — see docs/dashboard-v2-contract.md §A3.',
      };
      idempotencyCache.set(parsed.data.correlationId, placeholder);

      return errResp('NOT_IMPLEMENTED', 'Backend execution endpoint not yet implemented', {
        retryable: false,
        hint: 'Once /intents/:id/execute returns a structured execution event, swap this stub for the real call.',
        details: placeholder,
      });
    }
  );

  server.tool(
    'oracle.subscription.list',
    [
      'List the agent\'s recurring oracle payment subscriptions.',
      'Use for "what is the agent currently set up to send?" queries.',
      'Returns at most 200 rows; paginate by walletAddress if you need more.',
    ].join(' '),
    SubscriptionListSchema.shape,
    async (raw) => {
      const parsed = SubscriptionListSchema.safeParse(raw);
      if (!parsed.success) {
        return errResp('INVALID_ARGUMENTS', 'Argument validation failed', {
          details: parsed.error.flatten(),
          retryable: false,
        });
      }

      // Subscription persistence will land alongside the `oracle.payment.execute`
      // backend. Until then, return an empty-but-typed list so callers can
      // exercise their pagination/render code.
      return ok({
        filter: parsed.data,
        subscriptions: [] as Array<{
          id: string;
          walletAddress: string;
          amount: number;
          currency: string;
          cadence: 'once' | 'daily' | 'weekly' | 'monthly';
          status: 'active' | 'paused';
          createdAt: string;
        }>,
        backendStatus: 'pending_backend',
      });
    }
  );

  server.tool(
    'oracle.replay',
    [
      'Operator-gated replay of a previous payment run.',
      'REQUIRES OPS_API_KEY in the MCP server\'s environment.',
      'Use only for audit/forensics — never user-facing.',
    ].join(' '),
    ReplaySchema.shape,
    async (raw) => {
      const parsed = ReplaySchema.safeParse(raw);
      if (!parsed.success) {
        return errResp('INVALID_ARGUMENTS', 'Argument validation failed', {
          details: parsed.error.flatten(),
          retryable: false,
        });
      }

      const opsKey = process.env.OPS_API_KEY;
      if (!opsKey) {
        return errResp('FORBIDDEN', 'oracle.replay requires OPS_API_KEY in the MCP server environment', {
          retryable: false,
          hint: 'Set OPS_API_KEY before launching the MCP server, then retry.',
        });
      }

      // Stub: the real implementation will read the original correlationId
      // run from the events table and re-emit it to a private webhook.
      return ok({
        correlationId: parsed.data.correlationId,
        reason: parsed.data.reason,
        replayed: false,
        backendStatus: 'pending_backend',
        operatorAudit: {
          actor: 'OPS_API_KEY',
          message: 'Replay scheduled (stub).',
        },
      });
    }
  );
}
