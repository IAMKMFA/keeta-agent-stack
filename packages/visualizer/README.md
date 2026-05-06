# `@keeta-agent-stack/visualizer`

Reusable visual primitives that animate the Keeta Agent Stack execution flow:

```
Intent → Quote → Route → Policy → Simulate → Execute → Audit
```

## Boundaries

- **No backend calls.** This package never imports `node-fetch`, the SDK client, or anything that
  talks to the API. Consumers pass demo or live data in via props.
- **No WebGL / Three.js.** SVG + CSS + Motion for React is enough.
- **Reduced motion is non-negotiable.** Every animated component honours
  `prefers-reduced-motion: reduce` and degrades to a static composition with the same content.
- **No secrets.** No env reads, no signing material, no internal hostnames in defaults.

## Imports

The package ships two entry points so React Server Components can use the static building blocks
safely:

| Subpath                                | Use                                                                |
| -------------------------------------- | ------------------------------------------------------------------ |
| `@keeta-agent-stack/visualizer`        | Types, demo data, deterministic helpers. RSC-safe.                 |
| `@keeta-agent-stack/visualizer/client` | All React components and hooks. Carries the `'use client'` banner. |

## Anti-copy rule

Designs are inspired by PayAI's clarity rhythm and Keeta's institutional tone. Nothing in this
package copies their layouts, gradient stops, illustrations, motion choreography, or text. See
`docs/web/PAYAI_KEETA_INSPIRATION_MAP.md`.
