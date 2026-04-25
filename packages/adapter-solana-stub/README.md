# @keeta-agent-stack/adapter-solana-stub

Documented stub for a future Solana DEX integration. The `quote` and
`simulate` paths return realistic data so routing demos and policy rules can
include a Solana hop, but the **`execute(mode='live')` path throws
`SolanaNotImplementedError`** until the real on-chain logic lands.

> Disabled by default. Enable in long-lived workers/registries with
> `KEETA_ENABLE_SOLANA_STUB=true`. See
> [`docs/creating-new-adapter.md`](../../docs/creating-new-adapter.md).

## What ships today

| Path                            | Status                                                          |
| ------------------------------- | --------------------------------------------------------------- |
| `healthCheck`                   | Always healthy                                                  |
| `getCapabilities`               | Advertises configurable pairs (default `KTA/USDC`, `SOL/USDC`)  |
| `getQuote`                      | Returns indicative `QuoteResponse` (marked `raw.stub: true`)    |
| `execute({ mode: 'simulate' })` | Returns a confirmed-looking `ExecutionResult` for routing demos |
| `execute({ mode: 'live' })`     | **Throws `SolanaNotImplementedError` with a TODO list link**    |

## Roadmap (the TODO list lives in `solana-stub.ts`)

- swap @solana/web3.js for a pinned, dependency-injected client
- add Jupiter quote fetching
- KMS-backed Ed25519 signing
- priority fees + compute-budget instructions
- signature ↔ intent mapping for resume after restart
- slot/finality polling + reorg handling
- run the shared `runAdapterContractSuite` for `execute(live)` once real

## Why ship a stub?

Documented stubs let policy authors and route designers experiment with
multi-venue strategies before any real money moves. The `KEETA_ENABLE_*` flag
keeps the stub out of production registries, and the live-mode throw means an
operator can never accidentally route a settlement through an unfinished
adapter.
