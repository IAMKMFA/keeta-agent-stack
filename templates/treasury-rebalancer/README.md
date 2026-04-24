# Keeta Treasury Rebalancer (flagship template)

A working treasury-rebalancing agent built on `@keeta-agent-sdk/agent-runtime`.
Every tick the agent:

1. Reads the wallet's on-chain balances (or falls back to a synthetic 70/30
   demo allocation if the sandbox wallet is unfunded).
2. Computes per-asset drift versus a target weight map.
3. Picks the single most-drifted asset and emits one rebalance leg against
   the configured base asset.
4. Runs the leg through the SDK pipeline:
   `intent -> route -> policy (treasury-rebalancer pack) -> simulate -> execute`.
5. Logs structured events for each stage.

The policy pack is registered idempotently against the API on startup and
pinned to every emitted intent — so caps, slippage, venue and asset
allowlists, daily-trade counts, and unsettled-execution gates all apply
even though the agent is running outside the dashboard.

## Try it against the hosted sandbox

```bash
git clone https://github.com/IAMKMFA/keeta-agent-sdk
cd keeta-agent-sdk/templates/treasury-rebalancer

cp .env.example .env
# Create a wallet against the sandbox and copy the id into KEETA_WALLET_ID:
curl -X POST $KEETA_API_URL/wallets -H 'content-type: application/json' \
  -d '{"label":"treasury"}' | jq -r .id

pnpm install
pnpm dev            # runs the loop, defaults to simulate mode
```

What you should see (~once per minute, per the default
`REBALANCE_INTERVAL_SECONDS=60`):

```text
{"ts":"...","stage":"boot","apiUrl":"https://keeta-agent-sandbox-api.fly.dev",...}
{"ts":"...","stage":"policy.pack.create","name":"treasury-rebalancer"}
{"ts":"...","stage":"balances.synthetic","reason":"wallet has no on-chain balances; using synthetic 70/30 split for demo"}
{"ts":"...","stage":"balances.snapshot","balances":[{"asset":"KTA","amount":7000},{"asset":"USDC","amount":3000}]}
{"ts":"...","stage":"decision","kind":"leg","leg":{"baseAsset":"KTA","quoteAsset":"USDC","side":"sell","size":"1000.00","driftBps":1000,"rationale":"KTA 70.00% (target 60.00%) -> sell 1000.00 for USDC 30.00% (target 40.00%)"}}
{"ts":"...","stage":"intent.received","intentId":"...","mode":"simulate"}
{"ts":"...","stage":"route.done","intentId":"...","bestRouteId":"...","alternates":2}
{"ts":"...","stage":"policy.done","intentId":"...","allowed":true,"packId":"..."}
{"ts":"...","stage":"simulation.done","intentId":"...","slippageBps":3}
{"ts":"...","stage":"agent.result","kind":"simulated"}
```

The line that proves it worked is
`"stage":"agent.result","kind":"simulated"` (or `"executed"` once you flip
`REBALANCE_INTENT_MODE=live` against your own deployment) — the agent ran a
full rebalance leg through the policy pack.

## Configuration

All knobs live in `.env`:

| Variable | Default | Purpose |
|---|---|---|
| `KEETA_API_URL` | _(required)_ | Sandbox or your own deployment. |
| `KEETA_API_TOKEN` | _(empty)_ | Bearer token. Required for `OPS_API_KEY`-protected APIs. |
| `KEETA_WALLET_ID` | _(required)_ | The wallet UUID returned by `POST /wallets`. |
| `REBALANCE_INTERVAL_SECONDS` | `60` | Loop cadence. |
| `REBALANCE_DRIFT_THRESHOLD_BPS` | `200` | Skip ticks unless worst drift exceeds this. |
| `REBALANCE_MAX_LEG_NOTIONAL` | `10000` | Hard cap mirrored into the policy pack. |
| `REBALANCE_MAX_SLIPPAGE_BPS` | `50` | Slippage cap mirrored into the policy pack. |
| `REBALANCE_INTENT_MODE` | `simulate` | `simulate` against the sandbox; `live` against your own API. |

Target allocation lives in `src/config.ts` (`DEFAULT_TARGETS`). Edit the
weights — they must sum to 1.

## Going live

The default sandbox is read-only and runs against Keeta testnet. To run this
agent against your own deployment in `live` mode:

1. Stand up the API + worker per [`docs/deployment.md`](../../docs/deployment.md)
   (`docker-compose.prod.yml` or the Fly configs in `apps/*/fly.toml`).
2. Fund the wallet referenced by `KEETA_WALLET_ID`.
3. Set `KEETA_SIGNING_SEED` **on the worker only** (see
   [`SECURITY.md`](../../SECURITY.md)).
4. Set `REBALANCE_INTENT_MODE=live` and `KEETA_API_URL` to your API.

The policy pack will continue to gate every leg — adjust caps in
`src/policy.ts` if your treasury is larger than the defaults.

## Project layout

```
templates/treasury-rebalancer/
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
└── src/
    ├── agent.ts        # SDK + agent runtime + policy pack registration
    ├── config.ts       # env loading + frozen RebalancerConfig
    ├── index.ts        # CLI entry point and tick loop
    ├── policy.ts       # treasury-rebalancer policy pack definition
    └── rebalancer.ts   # pure rebalance math (drift -> single leg)
```

## How this differs from `starter-agent-template/`

`starter-agent-template/` is intentionally minimal — one intent, one hook
table, no policy pack — so users can copy it and start from blank. The
treasury rebalancer is the opinionated end of that spectrum: a real loop
with a real policy pack and real drift math, ready to point at the hosted
sandbox.
