import { describe, expect, it } from 'vitest';
import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { SolanaNotImplementedError, SolanaStubAdapter } from './solana-stub.js';

const adapter = new SolanaStubAdapter();

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'USDC',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});

describe('SolanaStubAdapter live mode', () => {
  it('is disabled by default and enabled by env flag', () => {
    expect(SolanaStubAdapter.isEnabled({})).toBe(false);
    expect(SolanaStubAdapter.isEnabled({ KEETA_ENABLE_SOLANA_STUB: 'true' })).toBe(true);
  });

  it('throws SolanaNotImplementedError when execute(mode=live) is called', async () => {
    await expect(
      adapter.execute({
        intentId: '550e8400-e29b-41d4-a716-446655440000',
        walletId: '6ba7b810-9dad-11d1-80b4-00c04fd430c8',
        mode: 'live',
      })
    ).rejects.toBeInstanceOf(SolanaNotImplementedError);
  });
});
