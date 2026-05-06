# Visualizer System — `@keeta-agent-stack/visualizer`

> Phase 4 deliverable. This document is the contract for the visual components that animate the
> Keeta Agent Stack execution flow on the public website.
>
> The package itself is at `packages/visualizer/`. Every component listed here corresponds to a real
> export.

---

## 1. Components

The package ships **eight** React components and three hooks. Components are bundled via the
`./client` subpath export and carry a `'use client'` banner. Demo data and types are RSC-safe and
exposed from the main entry.

| Component           | Purpose                                                                                                                                           | Where it shows up in `apps/web` |
| ------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------- |
| `AgentNetworkHero`  | Decorative SVG hero composition: agents (top), rails (middle), audit ledger (bottom). Animated value pulses travel along the connecting wires.    | `HeroSection` background.       |
| `IntentPipeline`    | Horizontal seven-stage diagram. A single rail with a moving completion bar; each stage card shows its repo evidence. Driven by `usePipelineDemo`. | `AgentPipelineSection`.         |
| `RouteGraph`        | Two columns: candidate quotes (left) with the chosen one highlighted, and the selected route hops with traveling dots (right).                    | `ArchitectureSection`.          |
| `PolicyGate`        | Decision badge (allow / review / deny) plus animated checks list.                                                                                 | `InteractiveDemoSection`.       |
| `SimulationConsole` | Terminal-style readout of pre-execution account deltas.                                                                                           | `InteractiveDemoSection`.       |
| `ExecutionTimeline` | Vertical timeline of execution steps with status glyphs and an audit-emitted summary card at the end.                                             | `InteractiveDemoSection`.       |
| `SettlementRailMap` | Grid of supported settlement rails with status (live / demo / paused), latency, and a description.                                                | `ArchitectureSection`.          |
| `LiveMetricsTicker` | Compact strip of headline metrics that count up via `useAnimatedNumber`.                                                                          | `/demo` page header.            |

### Hooks

| Hook                              | Use                                                                                                                                                                                   |
| --------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `useReducedMotionSafe()`          | SSR-safe reduced-motion flag. Always returns `false` on the server and the very first client render to avoid hydration mismatch.                                                      |
| `useAnimatedNumber(target, opts)` | Interpolates a number over `durationMs` with a cubic ease-out. Returns a formatted string at a given precision. Honours reduced motion (jumps straight to the target).                |
| `usePipelineDemo(opts)`           | Steps through the seven pipeline stages on a real-time clock. Returns `activeIndex`, `activeId`, and `start / pause / reset` controls. Reduced-motion users see the static end state. |

---

## 2. Data Model

All demo data is exported from `packages/visualizer/src/data/demo-pipeline.ts` as plain TypeScript
constants. There is no React, no fetch, no Node API in this file — which is what lets it be imported
from server components.

### Pipeline stage taxonomy

The seven stages are typed as a string literal union:

| `PipelineStageId`   | `label`  | Repo evidence                     |
| ------------------- | -------- | --------------------------------- |
| `intent_created`    | Intent   | `packages/sdk/src/client.ts`      |
| `quotes_gathered`   | Quote    | `packages/adapter-keeta-transfer` |
| `route_selected`    | Route    | `packages/routing`                |
| `policy_allowed`    | Policy   | `packages/policy`                 |
| `simulation_passed` | Simulate | `packages/simulator`              |
| `worker_executed`   | Execute  | `apps/worker`                     |
| `audit_emitted`     | Audit    | `packages/events`                 |

`PIPELINE_STAGE_ORDER` is the canonical ordering. `PIPELINE_STAGES` is the same list with rich
metadata (label, summary, dwell time, evidence path).

### Demo entities

Every component accepts its data via typed props with a sensible default sourced from
`demo-pipeline.ts`:

- `DEMO_INTENT` — purpose, source, destination, policy pack.
- `DEMO_QUOTES: DemoQuote[]` — venue, output display string, fee bps, latency ms, chosen flag.
- `DEMO_ROUTE: DemoRouteHop[]` — id, label, venue.
- `DEMO_POLICY` — `decision`, `pack`, `checks: DemoPolicyCheck[]`.
- `DEMO_SIMULATION: DemoSimulationLine[]` — account, delta, balance after.
- `DEMO_EXECUTION: DemoExecutionStep[]` — id, label, detail, optional `txHash`, status
  (`pending | submitted | confirmed`).
- `DEMO_AUDIT: DemoAuditEvent` — id, audit hash, receipt id, emitted ISO timestamp.
- `DEMO_METRICS: DemoMetric[]` — id, label, value, optional suffix and precision.
- `DEMO_RAILS: DemoSettlementRail[]` — id, label, chain, status, latency, description.

### Replacing demo data with live data

Components are **prop-driven**. To swap in live data, the consumer fetches it (in a server
component, an API route, or a client hook), shapes it into the same types the visualizer exports,
and passes it in:

```tsx
import { PolicyGate } from '@keeta-agent-stack/visualizer/client';
import type { DemoPolicyCheck } from '@keeta-agent-stack/visualizer';

function LivePolicyGate({ row }: { row: PipelineRow }) {
  const checks: DemoPolicyCheck[] = row.policy.checks.map((c) => ({
    id: c.id,
    summary: c.summary,
    outcome: c.outcome,
  }));
  return <PolicyGate decision={row.policy.decision} pack={row.policy.pack} checks={checks} />;
}
```

The visualizer never imports `apps/web/lib/api-client.ts` or any network code. **All fetching stays
in `apps/web` (or a future operator-only consumer).** This keeps the visualizer reusable in
storybook, MDX docs, and offline previews.

---

## 3. Motion Rules

Visualizer motion is deliberately quiet. Premium institutional fintech, not chaotic crypto.

### Allowed

| Motion                             | Where                                                  | Tokens                                          |
| ---------------------------------- | ------------------------------------------------------ | ----------------------------------------------- |
| Linear progress fill               | `IntentPipeline` rail                                  | `0.6s`, `cubic-bezier(0.22, 1, 0.36, 1)`        |
| Sequential row fade-in             | `PolicyGate`, `SimulationConsole`, `ExecutionTimeline` | per-row `0.32s`, `0.08–0.16s` stagger           |
| Repeating value pulse along a wire | `AgentNetworkHero`, `RouteGraph`                       | `4.2s` loop with offset, `repeatDelay 1.0–1.4s` |
| Status-dot ping                    | `SettlementRailMap` (live rails only)                  | CSS `animate-ping`                              |
| Gentle scale entrance              | `PolicyGate` decision card                             | `0.45s`, `cubic-bezier(0.22, 1, 0.36, 1)`       |
| Number count-up                    | `LiveMetricsTicker`                                    | `1.2s` cubic ease-out                           |

### Forbidden

- **No bouncing or overshoot easings.** Springs that overshoot read as consumer-grade and clash with
  the institutional tone.
- **No parallax.** Cheap and disorienting on long pages.
- **No autoplay video / audio.**
- **No animated GIFs or APNGs.** Use SVG.
- **No infinite confetti or particle fields.** A single repeating pulse along a path is the heaviest
  motion we ship.
- **No layout-jank entrance animations.** Components must SSR with the final layout already in
  place; motion only animates opacity, transform, or filter.

---

## 4. Reduced-Motion Behaviour

Every component degrades to a **static, complete** end state when `prefers-reduced-motion: reduce`
is set. This is enforced at three layers:

1. **Global CSS override** (`apps/web/app/globals.css`) zeros `animation-duration` and
   `transition-duration` on every element when the OS flag is set.
2. **`useReducedMotionSafe()`** is consulted in every animated component. SVG path animations
   (`<animateMotion>`) and looping `motion.circle` pulses are gated behind it — they don't render at
   all under reduced motion, instead of rendering and trying to be "still".
3. **`usePipelineDemo`** snaps `activeIndex` to the last stage and stops ticking. The static result
   is the visual end state of a completed pipeline.

A reduced-motion user therefore sees:

- The hero composition rendered as a still SVG, with the same nodes and rails but no traveling dots.
- The `IntentPipeline` rail completion bar already at 100% with the last stage marked active.
- The policy / simulation / execution / route lists rendered as static lists with all rows visible
  at once.
- The settlement rails rendered without the live-rail status pulse.
- Numeric metrics rendered at their final values with no count-up.

Hydration is mismatch-free because `useReducedMotionSafe` returns `false` during SSR and the very
first client render, then re-runs the component with the real value — components are written so this
single re-run never changes layout.

---

## 5. Future Live API Integration Plan

The visualizer is intentionally network-blind today. The plan to wire it up to live data lives in
`apps/web`, not here.

### Phase 4 (this phase)

- All components consume props with demo defaults.
- `apps/web` passes no props in the integration sites; demo data is shown.
- `apps/web/lib/api-client.ts` continues to power `InteractiveDemoSection` with its own row data
  (independent of the visualizer's demo fixtures, by design — different cardinalities).

### Phase 5 — homepage adoption (planned)

- Add an opt-in prop pipeline so server components in `apps/web/app/` can pass live
  `quote / route / policy / simulation / execution / audit` data into the visualizer when
  `publicEnv.liveMode` is on.
- Server components shape live API responses into the visualizer's exported types (`DemoQuote`,
  `DemoPolicyCheck`, etc.). The visualizer types stay the contract.

### Phase 6+ — operator-only live mode (planned)

- A future authenticated operator view (likely in `apps/dashboard`, not the public website) may
  consume the visualizer with real-time intent data via SSE/WebSocket. The visualizer requires no
  changes to support this; the consumer simply renders new prop values as they arrive.

### Hard rules for future integrations

- The visualizer must **never** acquire its own network code. Even a "convenience"
  `useLivePipeline()` belongs in `apps/web` (or a future operator library), not here.
- The visualizer must **never** read `process.env`. Live mode is a capability of the consumer, not
  of the visualizer.
- The visualizer must **never** add WebGL or Three.js. SVG + CSS + Motion for React is the ceiling.

---

## 6. Where the Components Render Today

| Section / page                                       | Visualizer components rendered                         |
| ---------------------------------------------------- | ------------------------------------------------------ |
| Homepage hero (`HeroSection`)                        | `AgentNetworkHero` (decorative)                        |
| Homepage pipeline (`AgentPipelineSection`)           | `IntentPipeline`                                       |
| Homepage interactive demo (`InteractiveDemoSection`) | `PolicyGate`, `SimulationConsole`, `ExecutionTimeline` |
| Homepage architecture (`ArchitectureSection`)        | `RouteGraph`, `SettlementRailMap`                      |
| `/demo` page                                         | `LiveMetricsTicker`                                    |

`apps/dashboard` is intentionally untouched in Phase 4. Reuse there is gated on Phase 6+ once live
data wiring has been validated on the website.

---

## 7. Anti-Copy Note

This package may not include text, layouts, gradient stops, illustrations, motion choreography, or
visual proportions copied from PayAI.network, Keeta.com, or any other proprietary site. The
inspiration is structural ("clarity") and thematic ("institutional fintech, agentic settlement"),
never literal. See `docs/web/PAYAI_KEETA_INSPIRATION_MAP.md` for the ground rules.
