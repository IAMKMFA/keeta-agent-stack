import { MockDexAdapter } from '@keeta-agent-sdk/adapter-mock-dex';

async function main() {
  const dex = new MockDexAdapter({
    spreadBps: 5,
    feeBps: 3,
    maxSlippageBps: 20,
    failureRate: 0,
    seed: 'rebalance',
  });
  const q = await dex.getQuote({
    adapterId: dex.id,
    baseAsset: 'KTA',
    quoteAsset: 'USDC',
    side: 'sell',
    size: '100',
  });
  console.log('mock quote', q);
}

main().catch(console.error);
