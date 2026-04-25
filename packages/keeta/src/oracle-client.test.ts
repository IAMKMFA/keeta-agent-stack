import { describe, expect, it, vi } from 'vitest';
import { KtaOracleClient, KtaOracleRequestError } from './oracle-client.js';

describe('KtaOracleClient', () => {
  it('builds rate query and parses JSON', async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      expect(String(input)).toBe(
        'https://kta-oracle.vercel.app/rate?currency=USD&wallet=keeta_abc'
      );
      return new Response(JSON.stringify({ price: 1.23 }), { status: 200 });
    });
    const client = new KtaOracleClient({ fetchImpl });
    const result = await client.getRate({ currency: 'USD', walletAddress: 'keeta_abc' });
    expect(result).toEqual({ price: 1.23 });
  });

  it('omits compare query string when params are missing', async () => {
    const fetchImpl = vi.fn(async (input: Parameters<typeof fetch>[0]) => {
      expect(String(input)).toBe('https://kta-oracle.vercel.app/compare');
      return new Response(JSON.stringify({ ok: true }), { status: 200 });
    });
    const client = new KtaOracleClient({ fetchImpl });
    const result = await client.comparePaymentRails();
    expect(result).toEqual({ ok: true });
  });

  it('throws typed errors for non-2xx responses', async () => {
    const fetchImpl = vi.fn(
      async () => new Response(JSON.stringify({ error: 'downstream' }), { status: 503 })
    );
    const client = new KtaOracleClient({ fetchImpl });
    const run = client.getStatus();

    await expect(run).rejects.toBeInstanceOf(KtaOracleRequestError);
    await expect(run).rejects.toMatchObject({
      status: 503,
      endpoint: 'https://kta-oracle.vercel.app/status',
    });
  });

  it('lists MCP tools via JSON-RPC', async () => {
    const fetchImpl = vi.fn(
      async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        expect(init?.method).toBe('POST');
        const body = JSON.parse(String(init?.body)) as { method: string };
        expect(body.method).toBe('tools/list');
        return new Response(
          JSON.stringify({
            result: {
              tools: [{ name: 'get_kta_rate' }],
            },
          }),
          { status: 200 }
        );
      }
    );
    const client = new KtaOracleClient({ fetchImpl });
    const result = await client.listMcpTools();
    expect(result).toEqual([{ name: 'get_kta_rate' }]);
  });

  it('calls MCP tools via JSON-RPC', async () => {
    const fetchImpl = vi.fn(
      async (_input: Parameters<typeof fetch>[0], init?: Parameters<typeof fetch>[1]) => {
        const body = JSON.parse(String(init?.body)) as {
          method: string;
          params: { name: string; arguments: { currency: string } };
        };
        expect(body.method).toBe('tools/call');
        expect(body.params.name).toBe('get_kta_rate');
        expect(body.params.arguments.currency).toBe('USD');
        return new Response(
          JSON.stringify({
            result: {
              content: [{ type: 'text', text: '{"ok":true}' }],
            },
          }),
          { status: 200 }
        );
      }
    );
    const client = new KtaOracleClient({ fetchImpl });
    const result = await client.callMcpTool('get_kta_rate', { currency: 'USD' });
    expect(result).toEqual({
      content: [{ type: 'text', text: '{"ok":true}' }],
    });
  });
});
