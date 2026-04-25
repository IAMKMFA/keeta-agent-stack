# simulation-fidelity example

Runs the simulator in `shadow` mode against a synthetic Keeta snapshot. The output shows every field
a `SimulationResult` carries so you can compare it side-by-side with `standard` (math only) and
`replay` (anchored backtest).

## Prerequisites

- No external services for the synthetic shadow shown here. To run a real shadow simulation against
  a live ledger, hit `POST /simulations/run` with `fidelityMode: 'shadow'` from a running API.

## Run it

```bash
pnpm --filter simulation-fidelity install
pnpm --filter simulation-fidelity exec tsx src/index.ts
```

## Expected output

A JSON `SimulationResult` block with `keetaSnapshot.fidelityMode === 'shadow'`, non-zero
`simulatedSlippageBps`, and a populated `pnlNote`.

## See also

- Root README:
  [Common Agent Patterns → Simulation fidelity](../../README.md#common-agent-patterns--examples)
- `packages/simulator` for the underlying engine.
