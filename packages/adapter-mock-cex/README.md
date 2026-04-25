# @keeta-agent-stack/adapter-mock-cex

In-memory mock central exchange (CEX) adapter for examples, simulations, and local routing
experiments. It complements `@keeta-agent-stack/adapter-mock-dex` by adding a deterministic
CLOB-style counterpart with configurable fees, latency, balances, and per-pair order books.

> Disabled by default. Enable in long-lived workers/registries with `KEETA_ENABLE_MOCK_CEX=true`.
> See [`docs/creating-new-adapter.md`](../../docs/creating-new-adapter.md).

## What you get

- `MockCexAdapter` — a `DexVenueAdapter` with:
  - per-pair `MockCexOrderBook` (`{ mid, spreadBps }`)
  - configurable `feeBps`, `latencyMs`, `latencyJitterMs`
  - in-memory balances updated on `execute({ mode: 'live' })`
  - a `getFills()` log for tests/dashboards
- `MockCexAdapter.isEnabled(env)` for guarding registration.

## Usage

```ts
import { MockCexAdapter } from '@keeta-agent-stack/adapter-mock-cex';

if (MockCexAdapter.isEnabled()) {
  registry.register(
    new MockCexAdapter({
      feeBps: 8,
      books: { 'KTA/USDC': { mid: '1.0', spreadBps: 6 } },
    })
  );
}
```

## Why this exists

A CLOB-style mock makes it possible to:

- demonstrate routing across multiple venues (mock DEX vs mock CEX)
- run reproducible simulation-fidelity comparisons
- exercise policy rules that depend on `venue.kind === 'dex'` with more than one fixture

For real CEX integrations, copy [`packages/adapter-template`](../adapter-template) and follow the
new-adapter guide.
