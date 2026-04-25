import { describe, expect, it } from 'vitest';
import {
  buildOraclePaymentPlaybook,
  normalizeOracleToolResult,
  type OracleToolCaller,
} from './oracle-playbook.js';

describe('normalizeOracleToolResult', () => {
  it('parses single text content JSON payload', () => {
    const normalized = normalizeOracleToolResult({
      content: [{ type: 'text', text: '{"ok":true}' }],
    });
    expect(normalized).toEqual({ ok: true });
  });

  it('returns payload unchanged when content is missing', () => {
    const normalized = normalizeOracleToolResult({ foo: 'bar' });
    expect(normalized).toEqual({ foo: 'bar' });
  });
});

describe('buildOraclePaymentPlaybook', () => {
  it('assembles playbook with required tool calls', async () => {
    const calls: Array<{ name: string; args: Record<string, unknown> }> = [];
    const client: OracleToolCaller = {
      async callMcpTool(name, args) {
        calls.push({ name, args });
        return {
          content: [{ type: 'text', text: JSON.stringify({ name, args }) }],
        };
      },
    };

    const playbook = await buildOraclePaymentPlaybook(client, {
      amount: 50000,
      currency: 'USD',
      compareFrom: 'all',
      includeSdkSnippet: true,
      network: 'test',
    });

    expect(playbook.outputs.rate.tool).toBe('get_kta_rate');
    expect(playbook.outputs.rails.tool).toBe('compare_payment_rails');
    expect(playbook.outputs.exchangeInstructions.tool).toBe('get_exchange_instructions');
    expect(playbook.outputs.sdkSnippet?.tool).toBe('get_sdk_snippet');

    expect(calls.map((c) => c.name)).toEqual([
      'get_kta_rate',
      'compare_payment_rails',
      'get_exchange_instructions',
      'get_sdk_snippet',
    ]);
  });
});
