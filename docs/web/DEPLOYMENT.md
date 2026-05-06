# Web Deployment

This guide covers deploying `apps/web`, the public read-only website for Keeta Agent Stack. The site
is safe to launch in demo mode with no live backend.

## Vercel Monorepo Setup

Create a Vercel project that points at this GitHub repository:

- Repository: `IAMKMFA/keeta-agent-stack`
- Framework preset: Next.js
- Project root: `apps/web`
- Install command: `cd ../.. && pnpm install --frozen-lockfile`
- Build command: `cd ../.. && pnpm build:web`
- Development command: `pnpm dev`

The app-local `apps/web/vercel.json` records those defaults. Keep the Vercel project root set to
`apps/web`; the install and build commands hop back to the monorepo root so workspace packages are
available.

## Environment Variables

Only public, browser-safe variables belong in the Vercel project.

| Variable                         | Required | Default             | Purpose                                                                                                 |
| -------------------------------- | -------- | ------------------- | ------------------------------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_MODE`          | No       | `true`              | Keeps the site on deterministic local demo data. Set to `false` only when live public probes are ready. |
| `NEXT_PUBLIC_KEETA_API_BASE_URL` | No       | unset               | Base URL for optional public read-only probes such as `/health`, `/status`, and `/openapi.json`.        |
| `NEXT_PUBLIC_DASHBOARD_URL`      | No       | repo dashboard path | Public link target for the operator dashboard. Do not use private admin URLs.                           |
| `NEXT_PUBLIC_DOCS_URL`           | No       | repo README         | Public link target for docs. Prefer `apps/docs` or published docs output.                               |

Never configure signing seeds, admin tokens, KMS material, database URLs, Redis URLs, `OPS_API_KEY`,
`ADMIN_BYPASS_TOKEN`, private keys, or service-account credentials in frontend env.

## Demo-Only Launch

Use this for the first public launch:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

With this setting, the website uses local fixtures only. It does not require `apps/api`, a worker,
Postgres, Redis, Keeta credentials, or a live signer.

## Live API Launch

Live mode is opt-in and read-only:

```bash
NEXT_PUBLIC_DEMO_MODE=false
NEXT_PUBLIC_KEETA_API_BASE_URL=https://public-api.example.com
```

The current web client defensively probes only public-safe endpoints:

- `/health`
- `/status`
- `/openapi.json`

Each fetch has a timeout and falls back to demo data on failures, bad URLs, invalid JSON, or offline
APIs. Do not enable live mode until the backend confirms which endpoints are public-safe.

## Preview Deployments

Vercel preview deployments should stay in demo mode unless the preview API is explicitly
public-safe. Recommended preview env:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Use preview deployments to validate copy, layout, e2e coverage, and docs links before promoting to
production.

## Local Production Check

From the repo root:

```bash
pnpm lint:web
pnpm typecheck:web
pnpm build:web
pnpm test:web:e2e
```

The Playwright script starts the built Next.js app on port `3002`, so run `pnpm build:web` before
the e2e command.
