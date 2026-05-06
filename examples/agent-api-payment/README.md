# agent-api-payment example

Runs the existing `createKeetaAgent` pipeline against simulated agent-payment rails:
`KTA -> x402 API credit -> pay.sh Gemini API call`.

## Prerequisites

- No live signing, facilitator, Google Cloud account, or pay.sh credentials are required.
- The example runs in `mode: "simulate"` and uses the local adapter registry.
- (Optional) Tune policy in `src/index.ts` to test rail allowlists and session spend caps.

## Run it

```bash
pnpm --filter @keeta-agent-stack/example-agent-api-payment install
pnpm --filter @keeta-agent-stack/example-agent-api-payment start
```

## Expected output

A pretty-printed JSON payload with sections:

```json
{
  "summary": { "...": "..." },
  "selectedRoute": { "steps": [] },
  "policyDecision": { "allowed": true },
  "simulatedReceipt": { "success": true },
  "timingBreakdownMs": { "totalMs": 0 }
}
```

## See also

- Root README:
  [Common Agent Patterns → Agent API payment](../../README.md#common-agent-patterns--examples)
- [`docs/agent-payment-rails.md`](../../docs/agent-payment-rails.md) for rail support levels and
  adapter behavior.
