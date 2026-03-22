import { KeetaTransferAdapter } from '@keeta-agent-sdk/adapter-keeta-transfer';
import { MockAnchorAdapter } from '@keeta-agent-sdk/adapter-mock-anchor';
import { MockDexAdapter } from '@keeta-agent-sdk/adapter-mock-dex';

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

  return [dex, anchor, transfer] as const;
}
