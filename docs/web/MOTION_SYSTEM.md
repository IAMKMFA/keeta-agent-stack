# Motion System

The website motion system should feel premium, quiet, and operational. Motion exists to guide
attention through the Keeta execution pipeline, not to decorate every surface.

## Principles

- Show value moving through the system: intent packets, route hops, policy checks, simulation lines,
  execution receipts.
- Keep motion restrained: short reveals, subtle glows, low-amplitude packet movement.
- Never make animation the only source of meaning.
- Respect `prefers-reduced-motion`.
- Prefer SVG and CSS over WebGL.

## Current Motion Primitives

| Primitive           | Location                                                       | Purpose                                                      |
| ------------------- | -------------------------------------------------------------- | ------------------------------------------------------------ |
| Scroll reveal       | `apps/web/components/motion/Reveal.tsx`                        | Reveals section headings and copy as users scroll.           |
| Staggered cards     | `apps/web/components/motion/Stagger.tsx`                       | Reveals repeated cards in small cascades.                    |
| Hero beams          | `apps/web/components/visual/HeroBeams.tsx`                     | Decorative light fields behind the first viewport.           |
| Background grid     | `apps/web/components/visual/GlowGrid.tsx` and global CSS       | Adds depth without raster assets.                            |
| Route packets       | `packages/visualizer/src/IntentPipeline.tsx`, `RouteGraph.tsx` | Shows movement through pipeline stages and route hops.       |
| Policy transition   | `packages/visualizer/src/PolicyGate.tsx`                       | Shows gate completion and check reveal order.                |
| Simulation playback | `packages/visualizer/src/SimulationConsole.tsx`                | Shows simulator output with a progress rail and line reveal. |
| Metric animation    | `packages/visualizer/src/LiveMetricsTicker.tsx`                | Counts values without changing layout.                       |

## Reduced Motion

Reduced-motion users should receive the same information in static form:

- Pipeline progress snaps to the active or final state.
- Packet movement is hidden.
- Simulation rows render without delay.
- Policy checks render without sequential movement.
- Global CSS shortens animation and transition duration.

## WebGL Policy

Phase 9 does not add WebGL or Three.js. Future 3D work must satisfy all of the following:

- Existing SVG/CSS implementation is already stable.
- The 3D feature is lazy-loaded.
- Mobile fallback exists.
- Reduced-motion fallback exists.
- Build, typecheck, lint, and Playwright remain green.
- The PR documents the route size impact.

## Copy And Accessibility

Do not use visible text to explain animation mechanics. Use product-state language instead:

- Good: `policy · approved`
- Good: `simulation passed`
- Avoid: `animated packet shows route movement`

Animations must not block keyboard navigation or focus visibility.
