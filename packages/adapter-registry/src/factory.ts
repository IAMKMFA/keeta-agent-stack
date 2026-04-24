import { KeetaTransferAdapter } from '@keeta-agent-stack/adapter-keeta-transfer';
import { MockAnchorAdapter } from '@keeta-agent-stack/adapter-mock-anchor';
import { MockCexAdapter } from '@keeta-agent-stack/adapter-mock-cex';
import { MockDexAdapter } from '@keeta-agent-stack/adapter-mock-dex';
import { OracleCctpRailAdapter } from '@keeta-agent-stack/adapter-oracle-rail';
import { SolanaStubAdapter } from '@keeta-agent-stack/adapter-solana-stub';
import type { VenueAdapter } from '@keeta-agent-stack/adapter-base';
import { AdapterRegistry } from './registry.js';

export function createDefaultDevAdapters() {
  const spread = Number(process.env.MOCK_DEX_SPREAD_BPS ?? 10);
  const fee = Number(process.env.MOCK_DEX_FEE_BPS ?? 5);
  const fail = Number(process.env.MOCK_DEX_FAILURE_RATE ?? 0);
  const delay = Number(process.env.MOCK_ANCHOR_SETTLEMENT_DELAY_MS ?? 0);

  const dex = new MockDexAdapter({
    spreadBps: spread,
    feeBps: fee,
    maxSlippageBps: 50,
    failureRate: fail,
  });
  const anchor = new MockAnchorAdapter({
    settlementDelayMs: delay,
    feeFixed: '0.001',
    stateWeights: { completed: 1, failed: 0 },
  });
  const transfer = new KeetaTransferAdapter();
  const oracleCctp = new OracleCctpRailAdapter();

  const adapters: VenueAdapter[] = [dex, anchor, transfer, oracleCctp];

  if (MockCexAdapter.isEnabled()) {
    adapters.push(new MockCexAdapter());
  }
  if (SolanaStubAdapter.isEnabled()) {
    adapters.push(new SolanaStubAdapter());
  }

  return adapters;
}

export function createDefaultDevRegistry(): AdapterRegistry {
  const registry = new AdapterRegistry();
  for (const adapter of createDefaultDevAdapters()) {
    registry.register(adapter);
  }
  return registry;
}
