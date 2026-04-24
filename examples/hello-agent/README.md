# `examples/hello-agent`

The 60-second hello agent. One file, top-to-bottom, that:

1. Pings the Keeta Agent Stack API.
2. Creates a server-managed wallet.
3. Creates a `USDC -> KTA` buy intent in `simulate` mode.
4. Queues a quote.

If this works, the SDK is wired correctly and you can move on to routing, policy evaluation, and execution by chaining `client.routeIntent(...)`, `client.policyIntent(...)`, and `client.executeIntent(...)`.

## Prereqs

A running API at `$KEETA_API_URL` (default `http://localhost:3001`). The simplest way to get one:

```bash
# from the repo root
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm dev:all
```

## Run

```bash
pnpm --filter @keeta-agent-stack/example-hello-agent start
```

Or, if you've installed the published packages from npm in your own project, copy [`src/index.ts`](./src/index.ts) verbatim — it depends only on `@keeta-agent-stack/sdk`.

## Expected output

```
health { ok: true }
wallet { id: '…', address: '…' }
intent { id: '…', side: 'buy', size: '10' }
quote queued { jobId: '…', queue: 'intent-quote' }
```
