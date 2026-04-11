import { runAdapterContractSuite } from '@keeta-agent-sdk/adapter-base/contract';
import { MockAnchorAdapter } from './mock-anchor.js';

const adapter = new MockAnchorAdapter({
  settlementDelayMs: 0,
  feeFixed: '0.01',
  seed: 'anchor-test',
  stateWeights: { completed: 1, failed: 0 },
  supportedPairs: [{ base: 'KTA', quote: 'ETH' }],
});

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'ETH',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});
