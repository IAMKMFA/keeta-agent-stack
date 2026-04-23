# rebalance-bot example

Single-leg quote against MockDex. The intent is the smallest piece of a
periodic rebalance loop — extend it by comparing wallet balances to a target
allocation and emitting an intent for the delta on a cron.

## Prerequisites

- No API needed; runs purely against the in-process MockDex.

## Run it

```bash
pnpm --filter rebalance-bot install
pnpm --filter rebalance-bot exec tsx src/index.ts
```

## Expected output

```
mock quote { ok: true, value: { adapterId: 'mock-dex', ... } }
```

## See also

- Root README: [Common Agent Patterns → Rebalance bot](../../README.md#common-agent-patterns--examples)
- [`docs/creating-new-adapter.md`](../../docs/creating-new-adapter.md) when you want to swap MockDex for a real venue.
