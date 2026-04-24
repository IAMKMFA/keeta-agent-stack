# `@keeta-agent-sdk/agent-runtime`

Higher-level orchestration on top of [`@keeta-agent-sdk/sdk`](https://www.npmjs.com/package/@keeta-agent-sdk/sdk). Wraps the intent pipeline behind a single `agent.execute(intent)` call with hooks for routing, policy, simulation, execution, and errors.

## Install

```bash
pnpm add @keeta-agent-sdk/agent-runtime @keeta-agent-sdk/sdk @keeta-agent-sdk/types
```

## Two ways to drive it

### Offline (no signing, no API)

```ts
import { createKeetaAgent } from '@keeta-agent-sdk/agent-runtime';
import { AdapterRegistry } from '@keeta-agent-sdk/adapter-registry';
import { MockDexAdapter } from '@keeta-agent-sdk/adapter-mock-dex';

const registry = new AdapterRegistry();
registry.register(new MockDexAdapter({ id: 'mock-dex', spreadBps: 10, feeBps: 5, maxSlippageBps: 4, failureRate: 0 }));

const agent = createKeetaAgent({
  name: 'paper-trader',
  registry,
  policy: { maxOrderSize: 1_000_000, maxSlippageBps: 500, venueAllowlist: [], assetAllowlist: [], liveModeEnabled: true },
  hooks: {
    afterRoute: (ctx) => console.log('best route', ctx.routes?.best.id),
    afterSimulation: (ctx) => console.log('slippage bps', ctx.simulationResult?.simulatedSlippageBps),
  },
});
```

### Live (delegates to the API + worker)

```ts
import { createClient } from '@keeta-agent-sdk/sdk';
import { createKeetaAgent } from '@keeta-agent-sdk/agent-runtime';

const sdk = createClient({ baseUrl: process.env.KEETA_API_URL! });
const agent = createKeetaAgent({ name: 'live-agent', sdk });
const result = await agent.execute({ ...intent, mode: 'live' });
```

The signing key never leaves the worker process. Your agent process is safe to host externally.

## Status

`0.1.0-alpha` — API may shift before `0.1.0`.

## License

Apache-2.0
