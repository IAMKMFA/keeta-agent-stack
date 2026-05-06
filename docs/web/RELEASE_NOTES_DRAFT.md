# Release Notes — `apps/web` (Draft)

> Draft for the first public publish of `apps/web`. Demo-only launch; live mode remains opt-in and
> gated. Update before tagging.

## Highlights

- **Public marketing site** for Keeta Agent Stack lives at `apps/web`, deployable to Vercel with
  `NEXT_PUBLIC_DEMO_MODE=true` and no backend dependency.
- **Demo mode by default.** The site renders deterministic fixtures from `packages/visualizer` and
  never calls a backend unless an operator explicitly enables live mode.
- **Live-mode preview is read-only.** When opt-in flags are set, the site probes only `/health`,
  `/status`, and `/openapi.json` on the configured base URL with a 4-second timeout and falls back
  to demo data on any failure.
- **Security copy is grounded in the repo.** Every claim on `/security` links to `SECURITY.md`,
  `WEBSITE_SECURITY_CLAIMS.md`, or a specific file in the codebase.

## Pages Shipped

- `/` — Hero, pipeline, capabilities, interactive demo, developer quickstart, architecture, security
  model, use cases, ecosystem, FAQ, CTA.
- `/demo` — Full pipeline playback, settlement rails, public API probes, live-mode posture summary.
- `/security` — Eight verifiable claims, env boundaries, demo-vs-live, things the frontend never
  receives, things we deliberately do not claim.
- `/stack` — Layer-by-layer breakdown of the execution stack.
- `/developers` — SDK / API / MCP / templates entrypoints.
- `/docs` — Documentation hub linking to canonical references.
- `/use-cases` — Real flows agents are running today.
- `/agents`, `/connectivity`, `/ramps`, `/superswap` — supporting surfaces.

## Engineering Notes

- Next.js 15.5.15 + React 19. Static export for the marketing pages, dynamic server rendering for
  two opt-in surfaces.
- First-load JS for `/` and `/demo` is 130 kB shared + page-specific, well under the 200 kB Phase
  target in `docs/web/PERFORMANCE_BUDGET.md`.
- Reduced-motion is honored via `MotionConfig reducedMotion="user"`,
  `LazyMotion features={domAnimation} strict`, and per-component `useReducedMotionSafe()` checks.
- Public-only env loader (`apps/web/lib/env.ts`) is the single source of truth for which
  `NEXT_PUBLIC_*` variables the website may read.
- 6/6 Playwright tests in `apps/web/tests/e2e/` cover homepage CTAs, primary navigation,
  `/security`, `/docs`, `/demo`, and reduced-motion rendering.
- Web CI (`.github/workflows/web-ci.yml`) runs lint, typecheck, build, and Playwright on every PR
  that touches the web slice.

## Bugfixes Included

- **Visualizer ↔ LazyMotion strict mode.** `packages/visualizer` now imports `m` from
  `framer-motion` instead of `motion`. The previous setup threw at first render under
  `LazyMotion strict`, blocking the homepage from hydrating in production. As a side effect,
  first-load JS dropped from 164 kB to 130 kB on `/` and `/demo`.
- **Honest probe timeout.** `/security` and `/demo` claim a "four-second timeout" on public probes;
  `apps/web/lib/api-client.ts` now matches with `FETCH_TIMEOUT_MS = 4000`.

## Known Issues

See `docs/web/KNOWN_ISSUES.md` for tracked open items at launch.

## Deployment

- Vercel project root: `apps/web`.
- Framework preset: Next.js.
- Install command: `cd ../.. && pnpm install --frozen-lockfile`.
- Build command: `cd ../.. && pnpm build:web`.
- Required env: `NEXT_PUBLIC_DEMO_MODE=true` (default).
- Optional env (live mode): `NEXT_PUBLIC_DEMO_MODE=false` plus
  `NEXT_PUBLIC_KEETA_API_BASE_URL=<public read-only origin>`.
- Never configure signing seeds, admin tokens, KMS material, database URLs, Redis URLs,
  `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, private keys, or service-account credentials in frontend env.

Full guidance: `docs/web/DEPLOYMENT.md`. Pre-launch verification list:
`docs/web/LAUNCH_CHECKLIST.md`. Rollback procedure: `docs/web/ROLLBACK.md`.

## Verification

```bash
pnpm install --frozen-lockfile
pnpm lint:web
pnpm typecheck:web
pnpm build:web
pnpm test:web:e2e
```

All five commands must pass. Web CI runs the same script set on every PR.
