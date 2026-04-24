# @keeta-agent-stack/adapter-template

Boilerplate for building a new Keeta venue adapter (DEX, anchor bridge, or
native transfer rail). Copy this package, rename it, and implement the
`getQuote` / `execute` paths against your real venue.

The full step-by-step walkthrough lives at
[`docs/creating-new-adapter.md`](../../docs/creating-new-adapter.md).

## What you get

- `TemplateAdapter` — a fully typed `DexVenueAdapter` skeleton that:
  - reports healthy via `healthCheck()`
  - advertises a configurable list of supported pairs
  - returns structured `UNSUPPORTED_PAIR` / `NOT_IMPLEMENTED` failures from
    `getQuote()`
  - throws `NotImplementedError` from `execute()` so the routing engine never
    selects an unfinished venue for live settlement
- A unit test (`template-adapter.test.ts`) you can copy alongside the real
  adapter to keep the shape honest.

## Quick start

```bash
cp -r packages/adapter-template packages/adapter-myvenue
# rename package.json "name" to @keeta-agent-stack/adapter-myvenue
pnpm install
pnpm --filter @keeta-agent-stack/adapter-myvenue test
```

Then:

1. Replace the `getQuote` body with a real upstream call.
2. Implement `execute` for both `simulate` and `live` modes (idempotent on
   `intentId`).
3. Add a `*.contract.test.ts` that runs `runAdapterContractSuite` from
   `@keeta-agent-stack/adapter-base/contract` once both paths are real.
4. Register the adapter in
   [`packages/adapter-registry/src/factory.ts`](../adapter-registry/src/factory.ts)
   behind a `KEETA_ENABLE_*` env flag.
5. Update [`docs/capability-matrix.md`](../../docs/capability-matrix.md).

## Why throw on `execute`

Routing treats `NOT_IMPLEMENTED` and adapter-thrown errors as soft failures —
the engine will still surface the venue for capability discovery and
documentation, but it will never pick an unfinished venue for a live route.
This keeps "documented but throwing" adapters safe to ship without risking a
half-built code path being selected in production.
