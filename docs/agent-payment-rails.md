# Agent Payment Rails

This repo now models x402, Machine Payments Protocol, and pay.sh as simulated agent-payment rails
inside the existing adapter architecture. They are not a parallel router, policy engine, or
registry.

## What They Are

- **x402**: an HTTP 402-style payment flow for agents paying API endpoints with stablecoin-priced
  requests.
- **MPP**: Machine Payments Protocol-style rails for agent and service payments.
- **pay.sh**: an x402-compatible API payment gateway surface modeled here with Google Cloud API
  discovery fixtures, including Gemini, BigQuery, and Vertex AI.

## How The Stack Wraps Them

Each rail is a `VenueAdapter` from `@keeta-agent-stack/adapter-base`:

- `@keeta-agent-stack/adapter-x402`
- `@keeta-agent-stack/adapter-pay-sh`
- `@keeta-agent-stack/adapter-mpp`

They implement `healthCheck`, `getCapabilities`, `supportsPair`, `getQuote`, and `execute`. Quote
and simulate paths are real enough for the router, simulator, policy engine, examples, and public
web surface. Live execution returns a structured not-configured result.

## When To Use Which Rail

| Rail   | Use when                                                               | Current support |
| ------ | ---------------------------------------------------------------------- | --------------- |
| x402   | An agent needs a priced HTTP 402 API request or API-credit hop         | Simulatable     |
| pay.sh | An agent needs API discovery plus a simulated paid Gemini/API call     | Simulatable     |
| MPP    | You want a parallel machine-payment rail shape for future integrations | Simulatable     |

## Example Walkthrough

Run:

```bash
pnpm --filter @keeta-agent-stack/example-agent-api-payment start
```

The example uses `createKeetaAgent`, registers `KeetaTransferAdapter`, `X402Adapter`,
`PayShAdapter`, and `MppAdapter`, then submits a simulated `ExecutionIntent`:

```text
KTA -> X402_API_CREDIT -> GEMINI_API_CALL
```

The existing router picks the x402/pay.sh path, the real policy engine checks
`perSessionAgentSpendCapUsd` and `allowedAgentPaymentRails`, and the simulator returns a
receipt-style result with timing details.

## Current Support Levels

| Package                                  | Support level             | Live execution       |
| ---------------------------------------- | ------------------------- | -------------------- |
| `@keeta-agent-stack/adapter-x402`        | `simulatable`             | Not configured       |
| `@keeta-agent-stack/adapter-pay-sh`      | `simulatable`             | Not configured       |
| `@keeta-agent-stack/adapter-mpp`         | `simulatable`             | Not configured       |
| `apps/web` fiat/card/bridge preset rails | `listed` to `simulatable` | Not adapter packages |

This is intentional: the stack can present and test agent-payment routes without overclaiming live
settlement support.
