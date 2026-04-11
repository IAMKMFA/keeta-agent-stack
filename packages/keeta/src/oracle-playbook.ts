import type { KtaOracleClient } from './oracle-client.js';

export interface OracleToolCaller {
  callMcpTool(name: string, args: Record<string, unknown>): Promise<unknown>;
}

export interface OracleToolEnvelope<TData = unknown> {
  tool: string;
  data: TData;
  raw: unknown;
}

export type OracleCompareFrom = 'swift' | 'bankwire' | 'stripe' | 'visa' | 'all';

export interface OraclePaymentPlaybookInput {
  amount: number;
  currency: string;
  walletAddress?: string;
  recipientWallet?: string;
  compareFrom?: OracleCompareFrom;
  complianceRegion?: string;
  includeSdkSnippet?: boolean;
  network?: 'main' | 'test';
}

export interface OraclePaymentPlaybook {
  generatedAt: string;
  input: OraclePaymentPlaybookInput;
  outputs: {
    rate: OracleToolEnvelope;
    rails: OracleToolEnvelope;
    exchangeInstructions: OracleToolEnvelope;
    compliance?: OracleToolEnvelope;
    sdkSnippet?: OracleToolEnvelope;
  };
  nextActions: string[];
}

function parseContentEntry(entry: unknown): unknown {
  if (!entry || typeof entry !== 'object') return entry;
  const kind = (entry as { type?: unknown }).type;
  const text = (entry as { text?: unknown }).text;
  if (kind === 'text' && typeof text === 'string') {
    try {
      return JSON.parse(text) as unknown;
    } catch {
      return text;
    }
  }
  return entry;
}

export function normalizeOracleToolResult(payload: unknown): unknown {
  const content = (payload as { content?: unknown }).content;
  if (!Array.isArray(content)) {
    return payload;
  }
  const normalized = content.map(parseContentEntry);
  if (normalized.length === 1) {
    return normalized[0];
  }
  return normalized;
}

export async function callOracleTool(
  client: OracleToolCaller,
  name: string,
  args: Record<string, unknown>
): Promise<OracleToolEnvelope> {
  const raw = await client.callMcpTool(name, args);
  return {
    tool: name,
    raw,
    data: normalizeOracleToolResult(raw),
  };
}

export async function buildOraclePaymentPlaybook(
  client: OracleToolCaller,
  input: OraclePaymentPlaybookInput
): Promise<OraclePaymentPlaybook> {
  const includeSdkSnippet = input.includeSdkSnippet ?? true;
  const network = input.network ?? 'test';
  const baseArgs = input.walletAddress ? { wallet_address: input.walletAddress } : {};

  const [rate, rails, exchangeInstructions] = await Promise.all([
    callOracleTool(client, 'get_kta_rate', { currency: input.currency, ...baseArgs }),
    callOracleTool(client, 'compare_payment_rails', {
      from: input.compareFrom ?? 'all',
      amount: input.amount,
      currency: input.currency,
    }),
    callOracleTool(client, 'get_exchange_instructions', {
      amount: input.amount,
      currency: input.currency,
      ...(input.recipientWallet ? { recipient_wallet: input.recipientWallet } : {}),
      ...baseArgs,
    }),
  ]);

  const compliancePromise = input.complianceRegion
    ? callOracleTool(client, 'get_compliance', {
        region: input.complianceRegion,
        section: 'all',
        ...baseArgs,
      })
    : Promise.resolve(undefined);

  const snippetPromise = includeSdkSnippet
    ? callOracleTool(client, 'get_sdk_snippet', {
        operation: 'send_kta',
        network,
        ...baseArgs,
      })
    : Promise.resolve(undefined);

  const [compliance, sdkSnippet] = await Promise.all([compliancePromise, snippetPromise]);

  const nextActions: string[] = [
    `Review exchange instructions for ${input.amount} ${input.currency}.`,
    'Validate chosen rail tradeoffs against compare_payment_rails output.',
  ];
  if (input.complianceRegion) {
    nextActions.push(`Apply ${input.complianceRegion} compliance guidance before settlement.`);
  }
  if (includeSdkSnippet) {
    nextActions.push('Use returned SDK snippet to execute transfer in agent workflow.');
  }

  return {
    generatedAt: new Date().toISOString(),
    input: {
      ...input,
      includeSdkSnippet,
      network,
    },
    outputs: {
      rate,
      rails,
      exchangeInstructions,
      ...(compliance ? { compliance } : {}),
      ...(sdkSnippet ? { sdkSnippet } : {}),
    },
    nextActions,
  };
}

export function asOracleToolCaller(client: KtaOracleClient): OracleToolCaller {
  return client;
}
