import { runAdapterContractSuite } from '@keeta-agent-sdk/adapter-base/contract';
import { KeetaTransferAdapter } from './transfer-adapter.js';

const adapter = new KeetaTransferAdapter();

runAdapterContractSuite(adapter, {
  supportedBase: 'KTA',
  supportedQuote: 'KTA',
  unsupportedBase: 'NOPE',
  unsupportedQuote: 'PAIR',
});
