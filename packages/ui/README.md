# `@keeta-agent-stack/ui`

Shared design system primitives for the Keeta Agent Stack — currently consumed by `apps/web` and
reserved for `apps/dashboard` adoption in a later phase.

## What ships here

- **Tokens** — colors, typography, spacing, radii, shadows, motion. No framework lock-in; consumers
  can use them with Tailwind, vanilla CSS, or styled-components.
- **Components** — server-component-friendly primitives: `Badge`, `Button`, `Card`, `Container`,
  `Section`, `MetricCard`, `StatusPill`, `Terminal`, `CodeBlock`, `FeatureCard`, `Tabs`,
  `Accordion`, `Marquee`.
- **Utilities** — `cn()` for class composition.

## Design principles

- **Dark institutional fintech base** — graphite surfaces, line dividers, high contrast text.
- **Luminous accents** — Keeta-inspired mint/cyan/blue, used sparingly.
- **Glass-card surfaces** — translucent panels with subtle inner highlight.
- **Accessible defaults** — focus rings, semantic markup, keyboard support on every interactive
  component.
- **Server-first** — components ship as plain server-renderable React unless they actually need
  browser state. Client components are explicitly marked.

## Anti-copy rule

This package may not include text, layout proportions, gradient stops, icons, or motion choreography
copied from PayAI.network, Keeta.com, or any other proprietary site. See
`docs/web/PAYAI_KEETA_INSPIRATION_MAP.md` for the ground rules.
