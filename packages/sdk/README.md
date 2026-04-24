# `@keeta-agent-sdk/sdk`

Typed HTTP client for the [Keeta Agent SDK](https://github.com/IAMKMFA/keeta-agent-sdk) control plane. Drives the durable intent → quote → route → policy → execute pipeline without ever touching a signing seed (those live only in the worker).

## Install

```bash
npm install @keeta-agent-sdk/sdk
# or
pnpm add @keeta-agent-sdk/sdk
```

## Quick start

```ts
import { createClient } from '@keeta-agent-sdk/sdk';

const client = createClient({
  baseUrl: process.env.KEETA_API_URL ?? 'http://localhost:3001',
});

const health = await client.health();

const wallet = await client.wallets.create({ label: 'hello-agent' });

const intent = await client.createIntent({
  walletId: wallet.id,
  baseAsset: 'USDC',
  quoteAsset: 'KTA',
  side: 'buy',
  size: '10',
  maxSlippageBps: 50,
  mode: 'simulate',
});

const quote = await client.quoteIntent({ intentId: intent.id });
console.log({ health, intent, quote });
```

## What's exposed

The factory returns a fully-typed object covering:

- **Health & config** — `health()`, `getConfigModes()`, `getStrategyTemplates()`, `listAvailableRails()`
- **Wallets** — `wallets.create()`, `wallets.import()`, `getWalletBalances()`
- **Intents** — `createIntent()`, `quoteIntent()`, `routeIntent()`, `evaluatePolicy()`, `executeIntent()`, `holdIntent()`, `releaseIntent()`, `approveIntent()`, `overrideIntentRoute()`
- **Policy packs** — `listPolicyPacks()`, `listPolicyRules()`, `previewPolicy()`, CRUD methods, strategy assignment helpers
- **Anchors & adapters** — `listPaymentAnchors()`, `createPaymentAnchorDraft()`, etc.
- **Webhooks & events** — `subscribeWebhook()`, `listWebhooks()`, `listEvents()`, `streamEvents()`

See the [SDK reference docs](https://github.com/IAMKMFA/keeta-agent-sdk/blob/main/docs/sdk-reference.md) and the live [OpenAPI spec](https://github.com/IAMKMFA/keeta-agent-sdk#sdk-reference--openapi) for the full surface.

## Status

`0.1.0-alpha` — API may shift before the `0.1.0` cut. Pin exact versions in production.

## License

Apache-2.0
