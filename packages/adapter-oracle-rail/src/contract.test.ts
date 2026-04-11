import { runAdapterContractSuite } from '@keeta-agent-sdk/adapter-base/contract';
import type { KtaOracleClient } from '@keeta-agent-sdk/keeta';
import { OracleCctpRailAdapter } from './cctp-rail-adapter.js';

const stubOracle = {
  getStatus: async () => ({ ok: true }),
  comparePaymentRails: async () => ({ mock: true }),
} as unknown as KtaOracleClient;

const adapter = new OracleCctpRailAdapter({ oracle: stubOracle });

runAdapterContractSuite(adapter, {
  supportedBase: 'USDC',
  supportedQuote: 'USDC',
  unsupportedBase: 'ETH',
  unsupportedQuote: 'USDC',
});
