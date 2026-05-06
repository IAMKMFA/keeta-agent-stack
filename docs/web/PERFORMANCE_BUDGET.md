# Web Performance Budget

This budget applies to `apps/web`, the public read-only Keeta Agent Stack website.

## Runtime Posture

- Default launch mode is demo-only.
- Live API probes are opt-in and read-only.
- No WebGL or Three.js in Phase 9.
- No new runtime dependencies were added for motion polish.
- Heavy decorative visuals should be lazy-loaded where possible.
- Static content should stay in Server Components.
- Client Components are reserved for motion, playback controls, mobile navigation, and safe demos.

## Budgets

| Area                  | Budget                                                                                              | Notes |
| --------------------- | --------------------------------------------------------------------------------------------------- | ----- |
| First-load JavaScript | Keep public routes near the current Next.js build output. Avoid large new client bundles.           |
| Visual dependencies   | Use existing `framer-motion`, SVG, CSS, and package visualizers only.                               |
| Animation cost        | Prefer transform, opacity, SVG stroke offsets, and CSS gradients. Avoid layout-affecting animation. |
| Network calls         | Demo mode performs no backend calls. Live mode must timeout and fall back.                          |
| Images and media      | Prefer existing SVG/vector primitives. Add raster media only when it carries product meaning.       |
| 3D/WebGL              | Out of scope unless lazy-loaded with mobile and reduced-motion fallbacks.                           |

## Guardrails

- Do not animate width/height of layout containers except narrow progress rails.
- Avoid `setInterval` animation loops in page components; use CSS, requestAnimationFrame hooks, or
  Framer Motion.
- Keep autoplay decorative motion non-essential.
- If an animation communicates state, also render text, status labels, or static indicators.
- Respect `prefers-reduced-motion` globally and inside visualizer components.

## Verification

Before launch:

```bash
pnpm lint:web
pnpm typecheck:web
pnpm build:web
pnpm test:web:e2e
```

Review the route size table emitted by `next build`. If a visual change materially increases a
public route, document why in the pull request and prefer lazy loading before accepting it.
