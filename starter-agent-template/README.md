# Keeta Starter Agent

Standalone TypeScript template for building a Keeta agent with [`@keeta-agent-stack/agent-runtime`](https://www.npmjs.com/package/@keeta-agent-stack/agent-runtime). It is intentionally outside the monorepo workspace so it can be copied anywhere once the `@keeta-agent-stack/*` packages are published.

> Alpha note: the npm scope is not live yet. Inside this repo, use `pnpm smoke`; it builds local packages, packs them into tarballs, and installs the template against those tarballs.

## One-command setup

```bash
cp .env.example .env
pnpm smoke
```

After npm publish, the standalone path will be `pnpm install && pnpm build && pnpm start`.

By default `pnpm start` dispatches a `payment` intent. Set `INTENT_KIND=rebalance` in `.env` to swap in the rebalance shape.

## What it does

- `src/agent.ts` constructs a `KeetaAgent` via `createKeetaAgent`, wiring every hook (`onIntent`, `beforeRoute`, ..., `onError`) to a single structured-log helper.
- `src/index.ts` loads `.env`, builds an intent (payment or rebalance), runs `agent.execute`, and prints the discriminated `ExecutionResult`.
- `scripts/smoke.ts` (run via `pnpm smoke`) copies the template into a temp directory and proves it still builds without the monorepo.

## Project layout

```
starter-agent-template/
├── .env.example
├── package.json
├── tsconfig.json
├── README.md
├── scripts/
│   └── smoke.ts
└── src/
    ├── agent.ts
    └── index.ts
```

## Troubleshooting

| Symptom | Likely cause | Fix |
|---|---|---|
| `ECONNREFUSED 127.0.0.1:3001` | The Keeta API isn't running. | From the monorepo root: `docker compose up -d && pnpm dev:all`. |
| `kind: 'failed'` with `error: 'No SDK supplied.'` | `KEETA_API_URL` is empty and you removed the SDK wiring. | Restore `KEETA_API_URL` in `.env` or add `registry` + `policy` for offline mode. |
| `kind: 'denied'` | Policy rejected the intent. | Inspect `result.detail.contributions` to see which rule failed. |
| `pnpm install` pulls workspace packages | You ran inside the monorepo. | Run from outside the monorepo or use `pnpm install --ignore-workspace`. |

## Going further

- Swap to live mode by setting `mode: 'live'` on the intent and supplying a real `walletId`.
- Add an `AdapterRegistry` + `PolicyConfig` to `createKeetaAgent` to run the route → policy → simulate pipeline locally without hitting the API.
- Fork this template into your own repo and pin specific package versions with `pnpm up @keeta-agent-stack/*`.

## Back to the monorepo

The full source for the Keeta Agent Stack lives at [github.com/IAMKMFA/keeta-agent-stack](https://github.com/IAMKMFA/keeta-agent-stack). See the root [`README.md`](https://github.com/IAMKMFA/keeta-agent-stack#build-your-first-trading-agent-in-10-minutes) for the 10-minute tutorial that this template implements.
