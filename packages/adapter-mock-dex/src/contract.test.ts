import { runAdapterContractSuite } from '@keeta-agent-stack/adapter-base/contract';
import { MockDexAdapter } from './mock-dex.js';

const adapter = new MockDexAdapter({
  spreadBps: 10,
  feeBps: 5,
  maxSlippageBps: 25,
  failureRate: 0,
  seed: 'test-seed',
});

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'USDC',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});
