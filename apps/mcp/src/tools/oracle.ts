import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KtaOracleClient, KtaOracleRequestError } from '@keeta-agent-stack/keeta';
import { ORACLE_MIRRORED_TOOLS, type OracleMirroredToolDefinition } from './oracle-catalog.js';

const DEFAULT_TIMEOUT_MS = 10_000;

function getOracleClient(): KtaOracleClient {
  const timeoutRaw = process.env.KTA_ORACLE_TIMEOUT_MS;
  const timeout = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  return new KtaOracleClient({
    baseUrl: process.env.KTA_ORACLE_BASE_URL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  });
}

function renderResponse(payload: unknown): { content: Array<{ type: 'text'; text: string }> } {
  return {
    content: [
      {
        type: 'text',
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

function parseContentText(text: string): unknown {
  try {
    return JSON.parse(text) as unknown;
  } catch {
    return text;
  }
}

function normalizeMcpToolPayload(payload: unknown): unknown {
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) return payload;
  const normalized = content.map((entry) => {
    if (!entry || typeof entry !== 'object') return entry;
    const type = (entry as { type?: unknown }).type;
    const text = (entry as { text?: unknown }).text;
    if (type === 'text' && typeof text === 'string') {
      return parseContentText(text);
    }
    return entry;
  });
  if (normalized.length === 1) {
    return normalized[0];
  }
  return normalized;
}

function toErrorPayload(error: unknown): unknown {
  // Standardised error envelope per docs/dashboard-v2-contract.md / MCP polish.
  if (error instanceof KtaOracleRequestError) {
    const status = error.status ?? 0;
    return {
      ok: false,
      error: {
        code: `ORACLE_HTTP_${status || 'ERROR'}`,
        message: error.message,
        retryable: status >= 500 || status === 429,
        hint:
          status === 429
            ? 'Rate-limited by KTA Oracle. Back off, then retry.'
            : status >= 500
              ? 'Upstream Oracle is degraded. Retry with exponential backoff.'
              : undefined,
        details: { endpoint: error.endpoint, body: error.body },
      },
    };
  }
  return {
    ok: false,
    error: {
      code: 'ORACLE_ERROR',
      message: error instanceof Error ? error.message : String(error),
      retryable: false,
    },
  };
}

function buildFieldSchema(field: {
  type: string;
  enum?: string[];
  description?: string;
}): z.ZodTypeAny {
  let schema: z.ZodTypeAny;
  if (field.type === 'number') {
    schema = z.number();
  } else if (field.type === 'boolean') {
    schema = z.boolean();
  } else {
    schema = z.string();
  }
  if (field.enum && field.enum.length > 0) {
    const allowed = new Set(field.enum);
    schema = z.string().refine((value) => allowed.has(value), {
      message: `Expected one of: ${field.enum.join(', ')}`,
    });
  }
  if (field.description) {
    schema = schema.describe(field.description);
  }
  return schema;
}

function buildInputShape(def: OracleMirroredToolDefinition): Record<string, z.ZodTypeAny> {
  const shape: Record<string, z.ZodTypeAny> = {};
  const required = new Set(def.required ?? []);
  for (const [name, field] of Object.entries(def.fields ?? {})) {
    const schema = buildFieldSchema(field);
    shape[name] = required.has(name) ? schema : schema.optional();
  }
  return shape;
}

function cleanArgs(args: Record<string, unknown>): Record<string, unknown> {
  return Object.fromEntries(Object.entries(args).filter(([, value]) => value !== undefined));
}

export function registerOracleTools(server: McpServer): void {
  for (const def of ORACLE_MIRRORED_TOOLS) {
    server.tool(
      def.name,
      `${def.description} (mirrored from KTA-Oracle).`,
      buildInputShape(def),
      async (args) => {
        try {
          const data = await getOracleClient().callMcpTool(def.name, cleanArgs(args));
          return renderResponse({
            tool: def.name,
            source: 'kta-oracle',
            data: normalizeMcpToolPayload(data),
          });
        } catch (error) {
          return renderResponse(toErrorPayload(error));
        }
      }
    );
  }

  server.tool(
    'keeta_oracle_list_mirrored_tools',
    'List all KTA-Oracle tools mirrored locally by this MCP server.',
    {},
    async () =>
      renderResponse({
        count: ORACLE_MIRRORED_TOOLS.length,
        tools: ORACLE_MIRRORED_TOOLS.map((tool) => tool.name),
      })
  );

  server.tool(
    'keeta_oracle_discover_upstream_tools',
    'Fetch current upstream KTA-Oracle MCP tool catalog (live discovery).',
    {},
    async () => {
      try {
        const tools = await getOracleClient().listMcpTools();
        return renderResponse({
          count: tools.length,
          tools,
        });
      } catch (error) {
        return renderResponse(toErrorPayload(error));
      }
    }
  );

  server.tool(
    'keeta_oracle_call',
    'Generic upstream Oracle tool call for forward compatibility with newly added tools.',
    {
      name: z.string().min(1).describe('Upstream KTA-Oracle MCP tool name'),
      args: z.record(z.unknown()).default({}).describe('Arguments payload for the selected tool'),
    },
    async ({ name, args }) => {
      try {
        const data = await getOracleClient().callMcpTool(name, cleanArgs(args));
        return renderResponse({
          tool: name,
          source: 'kta-oracle',
          data: normalizeMcpToolPayload(data),
        });
      } catch (error) {
        return renderResponse(toErrorPayload(error));
      }
    }
  );

  server.tool('keeta_oracle_get_status', 'Fetch KTA-Oracle service status.', {}, async () => {
    try {
      const data = await getOracleClient().getStatus();
      return renderResponse(data);
    } catch (error) {
      return renderResponse(toErrorPayload(error));
    }
  });

  server.tool(
    'keeta_oracle_list_tools',
    'List public KTA-Oracle tools and tiers.',
    {},
    async () => {
      try {
        const data = await getOracleClient().getTools();
        return renderResponse(data);
      } catch (error) {
        return renderResponse(toErrorPayload(error));
      }
    }
  );

  server.tool(
    'keeta_oracle_get_rate',
    'Fetch live KTA exchange rate from KTA-Oracle for one currency.',
    {
      currency: z.string().min(1).describe('Currency code like USD, EUR, SEK, JPY'),
      walletAddress: z
        .string()
        .optional()
        .describe('Optional keeta_ wallet for tier-aware responses'),
    },
    async ({ currency, walletAddress }) => {
      try {
        const data = await getOracleClient().getRate({ currency, walletAddress });
        return renderResponse(data);
      } catch (error) {
        return renderResponse(toErrorPayload(error));
      }
    }
  );

  server.tool(
    'keeta_oracle_compare_rails',
    'Compare Keeta vs legacy rails using KTA-Oracle pricing logic.',
    {
      from: z.enum(['swift', 'bankwire', 'stripe', 'visa', 'all']).optional(),
      amount: z.number().positive().optional(),
      currency: z.string().optional(),
    },
    async ({ from, amount, currency }) => {
      try {
        const data = await getOracleClient().comparePaymentRails({ from, amount, currency });
        return renderResponse(data);
      } catch (error) {
        return renderResponse(toErrorPayload(error));
      }
    }
  );
}
