/**
 * Scenario: rebalance bot.
 *
 * Demonstrates the smallest unit of a portfolio-rebalance loop: ask a single
 * adapter (here MockDex) for a quote on a target leg. Wire this into a cron
 * loop that compares wallet balances against a target allocation, emits an
 * intent for the delta, and runs it through `createKeetaAgent.execute`.
 *
 * Maps to the "Rebalance bot" row in the root README's Common Agent Patterns.
 */
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
