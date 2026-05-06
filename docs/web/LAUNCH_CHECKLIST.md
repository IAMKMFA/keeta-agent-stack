# Web Launch Checklist

Use this checklist before promoting `apps/web` to production.

## Repository Readiness

- Required files exist:
  - `apps/web/vercel.json`
  - `apps/web/playwright.config.ts`
  - `apps/web/tests/e2e/home.spec.ts`
  - `apps/web/tests/e2e/navigation.spec.ts`
  - `apps/web/tests/e2e/demo.spec.ts`
  - `.github/workflows/web-ci.yml`
- `pnpm lint:web` passes.
- `pnpm typecheck:web` passes.
- `pnpm build:web` passes.
- `pnpm test:web:e2e` passes after `pnpm build:web`.
- The Web CI workflow is green on the deployment commit.

## Demo-Only Launch

- `NEXT_PUBLIC_DEMO_MODE=true`.
- `NEXT_PUBLIC_KEETA_API_BASE_URL` is unset.
- Demo page renders deterministic fixtures.
- `/security` and `/docs` render.
- Hero CTAs route correctly.
- No signing seeds, admin tokens, KMS material, database URLs, Redis URLs, or service credentials
  are configured in Vercel.

## Live API Launch

- `NEXT_PUBLIC_DEMO_MODE=false`.
- `NEXT_PUBLIC_KEETA_API_BASE_URL` points to a public read-only API origin.
- Backend owners have confirmed public behavior for:
  - `/health`
  - `/status`, if present
  - `/openapi.json`, if exposed
- `/metrics` is not wired to the website unless a public-safe summary endpoint exists.
- Invalid or offline API URLs have been tested and fall back to demo data.

## Vercel Settings

- Project root is `apps/web`.
- Framework preset is Next.js.
- Install command is `cd ../.. && pnpm install --frozen-lockfile`.
- Build command is `cd ../.. && pnpm build:web`.
- Production branch is `main`.
- Preview deployments are enabled for pull requests.

## Final Smoke Test

- Open `/`.
- Open `/demo`.
- Open `/security`.
- Open `/docs`.
- Confirm primary navigation works.
- Confirm reduced-motion rendering does not break the homepage or demo page.
- Confirm no obvious browser console errors on core routes.
