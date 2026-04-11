export class KtaOracleRequestError extends Error {
  readonly status: number;
  readonly endpoint: string;
  readonly body: unknown;

  constructor(message: string, opts: { status: number; endpoint: string; body: unknown }) {
    super(message);
    this.name = 'KtaOracleRequestError';
    this.status = opts.status;
    this.endpoint = opts.endpoint;
    this.body = opts.body;
  }
}

export interface KtaOracleClientOptions {
  baseUrl?: string;
  timeoutMs?: number;
  fetchImpl?: typeof fetch;
}

export interface KtaOracleMcpTool {
  name: string;
  description?: string;
  inputSchema?: {
    type?: string;
    properties?: Record<string, unknown>;
    required?: string[];
  };
}

export interface OracleRateParams {
  currency: string;
  walletAddress?: string;
}

export interface OracleCompareParams {
  from?: 'swift' | 'bankwire' | 'stripe' | 'visa' | 'all';
  amount?: number;
  currency?: string;
}

const DEFAULT_BASE_URL = 'https://kta-oracle.vercel.app';
const DEFAULT_TIMEOUT_MS = 10_000;

function trimTrailingSlash(url: string): string {
  return url.endsWith('/') ? url.slice(0, -1) : url;
}

function cleanQuery(params: Record<string, string | number | undefined>): string {
  const query = new URLSearchParams();
  for (const [key, value] of Object.entries(params)) {
    if (value === undefined) continue;
    query.set(key, String(value));
  }
  return query.toString();
}

export class KtaOracleClient {
  private readonly baseUrl: string;
  private readonly timeoutMs: number;
  private readonly fetchImpl: typeof fetch;

  constructor(opts: KtaOracleClientOptions = {}) {
    this.baseUrl = trimTrailingSlash(opts.baseUrl ?? DEFAULT_BASE_URL);
    this.timeoutMs = opts.timeoutMs ?? DEFAULT_TIMEOUT_MS;
    this.fetchImpl = opts.fetchImpl ?? fetch;
  }

  async getStatus(): Promise<unknown> {
    return this.getJson('/status');
  }

  async getTools(): Promise<unknown> {
    return this.getJson('/tools');
  }

  async getRate(params: OracleRateParams): Promise<unknown> {
    const query = cleanQuery({
      currency: params.currency,
      wallet: params.walletAddress,
    });
    return this.getJson(`/rate?${query}`);
  }

  async comparePaymentRails(params: OracleCompareParams = {}): Promise<unknown> {
    const query = cleanQuery({
      from: params.from,
      amount: params.amount,
      currency: params.currency,
    });
    const suffix = query.length > 0 ? `?${query}` : '';
    return this.getJson(`/compare${suffix}`);
  }

  async listMcpTools(): Promise<KtaOracleMcpTool[]> {
    const response = await this.postJson('/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/list',
      params: {},
    });
    const tools = (response as { result?: { tools?: unknown } }).result?.tools;
    return Array.isArray(tools) ? (tools as KtaOracleMcpTool[]) : [];
  }

  async callMcpTool(name: string, args: Record<string, unknown>): Promise<unknown> {
    const response = await this.postJson('/mcp', {
      jsonrpc: '2.0',
      id: 1,
      method: 'tools/call',
      params: {
        name,
        arguments: args,
      },
    });
    const rpc = response as { error?: { message?: string }; result?: unknown };
    if (rpc.error) {
      throw new Error(rpc.error.message ?? `KTA-Oracle tool call failed: ${name}`);
    }
    return rpc.result;
  }

  private async getJson(path: string): Promise<unknown> {
    return this.requestJson(path, { method: 'GET' });
  }

  private async postJson(path: string, body: unknown): Promise<unknown> {
    return this.requestJson(path, {
      method: 'POST',
      headers: {
        'Content-Type': 'application/json',
      },
      body: JSON.stringify(body),
    });
  }

  private async requestJson(path: string, init: RequestInit): Promise<unknown> {
    const controller = new AbortController();
    const timeout = setTimeout(() => controller.abort(), this.timeoutMs);
    const endpoint = `${this.baseUrl}${path}`;
    try {
      const response = await this.fetchImpl(endpoint, {
        ...init,
        signal: controller.signal,
        headers: {
          Accept: 'application/json',
          ...(init.headers ?? {}),
        },
      });

      const text = await response.text();
      let parsed: unknown = text;
      try {
        parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
      } catch {
        parsed = text;
      }

      if (!response.ok) {
        throw new KtaOracleRequestError('KTA-Oracle request failed', {
          status: response.status,
          endpoint,
          body: parsed,
        });
      }
      return parsed;
    } finally {
      clearTimeout(timeout);
    }
  }
}
