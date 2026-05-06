# Design System — `@keeta-agent-stack/ui`

> Phase 3 deliverable. This document is the contract for the shared design system that powers
> `apps/web` today and is reserved for `apps/dashboard` adoption in a later phase.
>
> The package itself is at `packages/ui/`. Every claim in this file corresponds to a real export
> there.

---

## 1. Token Philosophy

The design system is **token-first**. Components compose Tailwind utility classes against the token
names below, but the tokens themselves are plain TypeScript constants and may be consumed directly
from any framework.

### Token surface

| Group        | Source                                 | What it covers                                                                                                                                                            |
| ------------ | -------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `colors`     | `packages/ui/src/tokens/colors.ts`     | Surfaces (`graphite`, `panel`, `line`), accents (`keeta`, `cyanline`, `ember`, `violet`), `ink` scale 50–900, semantic `state` (success, warning, danger, info, neutral). |
| `typography` | `packages/ui/src/tokens/typography.ts` | Family vars (`--font-sans`, `--font-mono`), sizes `xs`→`7xl`, weights, letter-spacing including `tightish`, leading.                                                      |
| `spacing`    | `packages/ui/src/tokens/spacing.ts`    | A subset of Tailwind's spacing scale plus a `pagePadding` map keyed by viewport class.                                                                                    |
| `radius`     | `packages/ui/src/tokens/radius.ts`     | `none, sm, md, lg, xl, 2xl, full`. Mirrored in `apps/web/tailwind.config.ts`.                                                                                             |
| `shadow`     | `packages/ui/src/tokens/shadow.ts`     | `glow`, `glowStrong`, `cardElevated`, `ring`.                                                                                                                             |
| `motion`     | `packages/ui/src/tokens/motion.ts`     | Durations (`instant, fast, base, slow, reveal`) and easings (`standard, emphasized, accelerate, decelerate`).                                                             |

### Principles

- **Names beat values.** Components reference `keeta`, `panel`, `line` — never raw hex. Hex strings
  are pinned in `colors.ts` once and once only.
- **Conservative palette.** Two accents (`keeta`, `cyanline`), three feedback colours
  (`ember/warning`, danger, info), one neutral scale. No "gradient kitchen sink".
- **Dark-first, light-impossible-for-now.** The site only renders dark mode. Tokens are designed to
  reverse cleanly later, but no light variant ships in this phase.
- **Mirroring rule.** When the package renames or adds a token, the `apps/web/tailwind.config.ts`
  mirror is updated in the same PR. The Tailwind config is the only acceptable runtime mirror.

---

## 2. Component List

All components live under `packages/ui/src/components/` and re-export from
`packages/ui/src/index.ts`.

### Server components (default)

| Component     | Purpose                                                                                                                               | Notes                                                                         |
| ------------- | ------------------------------------------------------------------------------------------------------------------------------------- | ----------------------------------------------------------------------------- |
| `Container`   | Max-width wrapper (`narrow / default / wide`).                                                                                        | Default size matches `apps/web`'s existing `max-w-7xl` rhythm.                |
| `Section`     | Standard page section with optional `eyebrow / title / description`. Density `compact / default / spacious`.                          | Honours the same vertical rhythm the existing pages use.                      |
| `Card`        | Surface primitive (`glass / solid / outline`), padding scale, optional `interactive` hover.                                           | Replaces the `surface-card` utility long-term.                                |
| `Badge`       | Inline label with tones `neutral / success / info / warning / danger / accent` and `soft / outline` variants.                         | Static — no JS.                                                               |
| `StatusPill`  | Live-state indicator with statuses `live / demo / degraded / paused / unknown`, optional pulse.                                       | Used in the website footer and `/demo`.                                       |
| `Button`      | Polymorphic `<button>` / `<a>` with variants `primary / secondary / ghost / danger`, sizes `sm / md / lg`, optional left/right slots. | Server-render-safe. Focus-ring tuned to brand.                                |
| `MetricCard`  | Stat surface with optional trend indicator.                                                                                           | Built on `Card`.                                                              |
| `Terminal`    | Generic dark terminal chrome with traffic-light dots and optional caption.                                                            | Pair with `<CodeBlock>` or stream raw text inside.                            |
| `CodeBlock`   | Lightweight `<pre><code>` (or inline `<code>`) with a language tag.                                                                   | No syntax highlighter dependency in this phase.                               |
| `FeatureCard` | Icon + title + summary + footnote. Optional `href` makes the whole card a focusable link.                                             | Used by `/docs`.                                                              |
| `Accordion`   | Native `<details>` / `<summary>` driven. Single-expand-by-default.                                                                    | Keyboard, screen reader, and reduced-motion behaviour come from the platform. |
| `Marquee`     | Pure CSS, two-copy seamless loop with optional fade mask.                                                                             | Honours `prefers-reduced-motion` via the global stylesheet.                   |

### Client components

Client-only components ship from a separate subpath export so the `'use client'` directive survives
bundling. Import them from `@keeta-agent-stack/ui/client`, **not** the main entry.

| Component | Import                         | Why client                                            | Notes                                                                                                     |
| --------- | ------------------------------ | ----------------------------------------------------- | --------------------------------------------------------------------------------------------------------- |
| `Tabs`    | `@keeta-agent-stack/ui/client` | Manages active state, supports arrow keys, Home, End. | `role="tablist" / "tab" / "tabpanel"` wired correctly; `aria-selected` and `aria-controls` set per panel. |

The package's `exports` map declares three subpaths today:

- `@keeta-agent-stack/ui` — server-component-safe primitives + `cn`.
- `@keeta-agent-stack/ui/client` — components that require client state.
- `@keeta-agent-stack/ui/tokens` — raw token constants for non-React consumers.

### Utility

- `cn(...inputs)` — `clsx` composed with `tailwind-merge`. Re-exported from `apps/web/lib/cn.ts` so
  the website routes through the package.

---

## 3. Accessibility Rules

These are the non-negotiable behaviours every component (and every consumer of the system) must
respect.

### Keyboard

- **All interactive elements** must reach focus with `Tab`, accept activation with `Enter` / `Space`
  (where appropriate), and emit a visible focus ring. Components ship with the focus ring already
  configured (`focus-visible:ring-keeta/60`).
- **`Tabs`** supports `ArrowLeft / ArrowRight / ArrowUp / ArrowDown`, `Home`, `End`. Disabled tabs
  are skipped during traversal.
- **`Accordion`** is `<details>` / `<summary>` — keyboard support is free.

### Semantics

- `Button` always renders `<button type="button">` unless an `href` is supplied (then `<a>`).
- `StatusPill` is a `<span>`; the dot is `aria-hidden` so screen readers only hear the label.
- `Tabs` panels carry `aria-labelledby`; the inactive panels are hidden via `hidden` (not
  `display: none` only) so AT skip them.
- `Marquee` carries `role="marquee"` and accepts an `ariaLabel` so decorative use does not confuse
  AT.

### Contrast and focus

- Body text runs on the `panel` / `graphite` surfaces with `zinc-300` / `zinc-400` for support text.
  Headlines are pure `white`.
- Focus ring uses the `keeta` accent at 60% opacity, with a `ring-offset-graphite` so the ring sits
  clearly above the surface.

### Reduced motion

- The website's `app/globals.css` zeros `animation-duration` and `transition-duration` when
  `prefers-reduced-motion: reduce` is set. Every component in this package builds **on** that
  override — hover transitions degrade to instant, fade-up reveals collapse to static, marquee
  freezes.

---

## 4. Motion Rules

Motion is a budget, not a requirement.

| Token                            | Use                                                               |
| -------------------------------- | ----------------------------------------------------------------- |
| `motion.duration.fast` (120ms)   | Hover colour / border transitions on `Button` and `Card`.         |
| `motion.duration.base` (200ms)   | Default hover transitions.                                        |
| `motion.duration.slow` (320ms)   | Card lift on `surface-card-hover`.                                |
| `motion.duration.reveal` (480ms) | Fade-up reveals (`Reveal` component in `apps/web`).               |
| `motion.easing.standard`         | Default for hover and reveals (`cubic-bezier(0.22, 1, 0.36, 1)`). |
| `motion.easing.emphasized`       | Reserved for entrance choreography.                               |

Hard rules:

- **Never auto-play video.**
- **Never play audio.**
- **No carousels** that auto-rotate.
- **No parallax.**
- **No bouncing / overshoot easings.** They feel cheap and clash with an institutional fintech tone.
- **Respect `prefers-reduced-motion: reduce`.** If a component cannot meaningfully degrade, ship a
  static fallback through `<ReducedMotionBoundary fallback={...}>` (in `apps/web`).

---

## 5. Adoption Map for `apps/web`

Phase 3 deliberately keeps adoption surgical so the homepage build stays byte-stable for visual
regressions.

| File                                      | Change                                         |
| ----------------------------------------- | ---------------------------------------------- |
| `apps/web/lib/cn.ts`                      | Re-exports `cn` from `@keeta-agent-stack/ui`.  |
| `apps/web/components/site/SiteFooter.tsx` | Uses `StatusPill` for the live/demo indicator. |
| `apps/web/app/demo/page.tsx`              | Uses `StatusPill` in the page header.          |
| `apps/web/app/docs/page.tsx`              | Uses `Container`, `Section`, `FeatureCard`.    |
| `apps/web/package.json`                   | Adds `@keeta-agent-stack/ui: workspace:*`.     |
| `apps/web/next.config.ts`                 | Adds the package to `transpilePackages`.       |

The remaining homepage and section components keep their existing inline styles. Phase 5 (homepage)
and beyond will incrementally migrate them as new sections land.

`apps/dashboard` is intentionally untouched in Phase 3.

---

## 6. Anti-Copy Note

This package and its tokens may not include text, layouts, proportions, gradient stops, illustration
motifs, or motion choreography lifted from PayAI.network, Keeta.com, or any other proprietary site.
The naming and token vocabulary is generic ("keeta accent" is our internal label for our own brand
colour, not a reproduction of a third-party mark).

If a future component visually resembles an external site too closely, the rule is: rewrite the
component, not the comparison. The comparison surface for visual regression must always be our own
fixtures, never an external site's.

For the structural (PayAI) and thematic (Keeta) inspiration map see
`docs/web/PAYAI_KEETA_INSPIRATION_MAP.md`. For the security-flavoured copy gate see
`docs/web/WEBSITE_SECURITY_CLAIMS.md`.
