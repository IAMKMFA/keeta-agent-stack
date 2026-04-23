# oracle-payment-playbook example

Calls `buildOraclePaymentPlaybook` to turn a payment requirement (amount,
currency, optional wallet) into rates, available rails, and machine-actionable
exchange instructions.

## Prerequisites

- Either the live KTA Oracle (`KTA_ORACLE_BASE_URL`) or the bundled mock that
  ships with `@keeta-agent-sdk/keeta`. The example falls back to the mock when
  no env is set.
- (Optional) `KTA_ORACLE_TIMEOUT_MS` to tighten the network timeout.

## Run it

```bash
pnpm --filter oracle-payment-playbook install
pnpm --filter oracle-payment-playbook exec tsx src/index.ts
```

## Expected output

A pretty-printed JSON payload with sections:

```
{
  "summary": { ... },
  "rate": { "currency": "USD", "rate": ... },
  "rails": [...],
  "exchangeInstructions": { ... },
  "sdkSnippet": "..."
}
```

## See also

- Root README: [Common Agent Patterns → Oracle payment playbook](../../README.md#common-agent-patterns--examples)
- [`examples/mcp-llm-integration.md`](../mcp-llm-integration.md) for the LLM-driven walkthrough using the new `oracle.payment.preview` / `oracle.payment.execute` MCP tools.
