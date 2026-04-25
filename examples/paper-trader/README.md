# paper-trader example

Smallest possible "is the agent connected to Keeta?" check. Hits `GET /health` on the API, then
prints a hint for extending the script into a full simulate loop.

## Prerequisites

- API running locally: `pnpm dev:all` from the repo root, or
  `pnpm --filter @keeta-agent-stack/api dev`.
- (Optional) `API_URL` env override if you point at a remote control plane.

## Run it

```bash
pnpm --filter paper-trader install
pnpm --filter paper-trader exec tsx src/index.ts
```

## Expected output

```
health { ok: true }
Paper trader example — wire intents + simulations against a running API.
```

If you see `ECONNREFUSED 127.0.0.1:3001`, the API isn't running.

## See also

- Root README:
  [Common Agent Patterns → Paper trader](../../README.md#common-agent-patterns--examples)
- For a hooked-up `createKeetaAgent` version, see
  [`starter-agent-template/`](../../starter-agent-template/).
