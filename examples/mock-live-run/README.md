# mock-live-run example

End-to-end smoke harness. Builds the default dev adapter set, picks a rail
(KTA-native or Oracle-planned CCTP), and runs route → simulate (or live).
Useful as a one-shot promotion gate before deploying.

## Prerequisites

- For `--live`, the worker must be running with a configured signing seed
  (`docker compose up -d && pnpm dev:all`). Otherwise no external services are
  required.

## Run it

```bash
pnpm --filter mock-live-run install

# Default: KTA rail, simulate mode
pnpm --filter mock-live-run exec tsx src/index.ts

# CCTP rail, simulate mode
pnpm --filter mock-live-run exec tsx src/index.ts -- --cctp

# Live execution (requires worker + signing seed)
pnpm --filter mock-live-run exec tsx src/index.ts -- --live
```

## Expected output

```
rail kta route <route-id> simulation { id: '...', success: true, ... }
```

`--live` will additionally surface a `txId` from the worker.

## See also

- Root README: [Common Agent Patterns → mock-live-run](../../README.md#common-agent-patterns--examples)
- [`docs/deployment.md`](../../docs/deployment.md) for the production topology this script smokes.
