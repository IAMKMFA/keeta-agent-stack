# Known Issues — `apps/web` (Phase 11 Snapshot)

> Open items recorded at the moment of launch readiness. None of these block a demo-only launch.
> Each issue is paired with severity, scope, and a proposed next action.

---

## 1. Live-Mode API Origin Not Yet Confirmed

- **Severity:** Low (gated by env; default posture is demo).
- **Scope:** Operations / backend ownership.
- **Detail:** Live mode requires `NEXT_PUBLIC_DEMO_MODE=false` plus `NEXT_PUBLIC_KEETA_API_BASE_URL`
  pointing at a confirmed public, read-only origin. As of this snapshot, no origin has been blessed
  by backend owners as public-safe for `/health`, `/status`, and `/openapi.json`.
- **Mitigation:** The website ships demo-only by default. `vercel.json` pins
  `NEXT_PUBLIC_DEMO_MODE=true`. Live mode falls back to demo data on any failure (`safe-fetch.ts` +
  `api-client.ts`).
- **Next action:** Coordinate with `apps/api` owners to confirm a public origin and verify the three
  probe paths return non-sensitive responses. Then update `NEXT_PUBLIC_KEETA_API_BASE_URL` per
  environment.

## 2. `/openapi.json` Live Link in `/docs`

- **Severity:** Low.
- **Scope:** `apps/web/app/docs/page.tsx`.
- **Detail:** The "live OpenAPI" link in `/docs` resolves to `siteConfig.openApiLocalUrl` (a
  localhost pointer). This is intentional while no public API origin is published, but readers on
  the public site will see a broken link if they click it.
- **Mitigation:** The link is labelled clearly ("while the API is running locally") and points at
  `apps/api · /openapi.json` as the canonical reference path. The static OpenAPI snapshot in
  `apps/docs/dist` is the recommended public-readable source.
- **Next action:** Replace `openApiLocalUrl` with the hosted equivalent once GitHub Pages or another
  public docs host is enabled (gated on `ENABLE_GITHUB_PAGES=true` per `README.md`).

## 3. Mobile Viewport Coverage in CI

- **Severity:** Low.
- **Scope:** `apps/web/playwright.config.ts`.
- **Detail:** Playwright currently runs only Chromium at 1280×720. Mobile viewport coverage relies
  on manual checks in this pass.
- **Mitigation:** All sections use Tailwind responsive utilities; `MobileNav` is verified to render
  below `md`; manual viewport checks at 375 px, 768 px, and 1440 px showed no breakage on the
  production build.
- **Next action:** Add a Playwright project for an iPhone-class viewport (e.g.
  `devices['iPhone 12']`) once the launch baseline is published.

## 4. Public Probe Snapshot Cached Per Build

- **Severity:** Informational.
- **Scope:** `apps/web/app/demo/page.tsx`, `apps/web/lib/api-client.ts`.
- **Detail:** `getPublicApiSnapshot()` runs at request time for the dynamic `/demo` server render
  path, but in demo mode (default) the snapshot is constant. Live mode produces fresh probes per
  request. Fall-back behavior is deterministic and tested.
- **Mitigation:** None required. Documented here so operators understand what `/demo` displays in
  each mode.

## 5. Test Result Artifacts Are Untracked

- **Severity:** Informational.
- **Scope:** `apps/web/test-results/`, `apps/web/playwright-report/`.
- **Detail:** Past failure runs left screenshots, traces, and webm videos in
  `apps/web/test-results/` (visible in `git status`). These are Playwright-generated artifacts and
  should not be committed.
- **Mitigation:** Add `apps/web/test-results/` and `apps/web/playwright-report/` to `.gitignore` if
  not already covered.
- **Next action:** Verify and extend `.gitignore` if needed (out of scope for this Phase 11 pass;
  ignored by default by `.last-run.json` only).

## 6. Visualizer Bundle Bigger Than Strictly Necessary

- **Severity:** Informational.
- **Scope:** `packages/visualizer/`.
- **Detail:** With the Phase 11 fix (`m` instead of `motion`), tree shaking now works under
  `LazyMotion`. There is still room to defer the heaviest visualizer surfaces (`AgentNetworkHero`,
  `IntentPipeline`) behind `next/dynamic` for additional first-paint savings.
- **Mitigation:** Already partially achieved via
  `apps/web/components/visual/LazyAgentNetworkHero.tsx`. Performance is within the 200 kB Phase
  target.
- **Next action:** Optional: extend the lazy boundary to the demo board components if first-paint
  regresses on slower devices.

## 7. No Live Backend Smoke Test in Web CI

- **Severity:** Low.
- **Scope:** `.github/workflows/web-ci.yml`.
- **Detail:** Web CI runs only against demo mode. There is no scheduled smoke run that flips live
  mode against a real public-safe origin.
- **Mitigation:** Live mode is opt-in and falls back deterministically. Manual verification is
  required when toggling live mode.
- **Next action:** When a public origin is confirmed (see Issue 1), add a scheduled workflow that
  exercises `pnpm test:web:e2e` with `NEXT_PUBLIC_DEMO_MODE=false` and
  `NEXT_PUBLIC_KEETA_API_BASE_URL` set via repository variable.

---

None of the items above blocks a demo-only public launch. Items 1, 2, and 7 should be revisited when
the public API origin is published; the rest are informational or low-priority polish.
