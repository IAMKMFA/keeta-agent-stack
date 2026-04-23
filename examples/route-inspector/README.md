# route-inspector example

Builds the routing engine on top of the default dev adapter set and prints the
best route plus the count of alternates for one canonical intent.

## Prerequisites

- No external services. Everything runs in-process.

## Run it

```bash
pnpm --filter route-inspector install
pnpm --filter route-inspector exec tsx src/index.ts
```

## Expected output

```
best { id: '...', steps: [ ... ], score: 0.97, ... }
alternates 2
```

The exact alternates count depends on which dev adapters are registered.

## See also

- Root README: [Common Agent Patterns → Route inspector](../../README.md#common-agent-patterns--examples)
- `packages/routing` for the scoring internals.
