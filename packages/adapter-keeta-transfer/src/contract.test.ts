import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { KeetaTransferAdapter } from './transfer-adapter.js';

const adapter = new KeetaTransferAdapter('keeta-transfer', 'test', {
  readHealth: async (network) => ({
    network,
    measuredAt: '2026-01-01T00:00:00.000Z',
    latencyMs: 12,
    ok: true,
    ledger: {
      blockCount: 1,
      transactionCount: 2,
      representativeCount: 3,
    },
  }),
});

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'KTA',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});
