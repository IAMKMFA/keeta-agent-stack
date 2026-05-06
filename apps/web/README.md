# `@keeta-agent-stack/web`

The public marketing and product surface for the Keeta Agent Stack.

## What this is

A Next.js 15 (App Router) + React 19 + Tailwind 3 site that explains the stack, links into the docs,
and previews the **Intent → Quote → Route → Policy → Simulate → Execute → Audit** pipeline with
deterministic demo data.

The site is **read-only by design**. It never submits intents, never calls admin routes, and never
touches operator credentials. See [`SECURITY.md`](../../SECURITY.md) at the repo root.

## Routes

| Route                                           | Source                                                               |
| ----------------------------------------------- | -------------------------------------------------------------------- |
| `/`                                             | `app/page.tsx` — full homepage.                                      |
| `/stack`                                        | `app/stack/page.tsx` — every layer of the stack.                     |
| `/developers`                                   | `app/developers/page.tsx` — quickstart + SDK + MCP + templates.      |
| `/demo`                                         | `app/demo/page.tsx` — the pipeline preview, end-to-end.              |
| `/security`                                     | `app/security/page.tsx` — security model, grounded in repo evidence. |
| `/use-cases`                                    | `app/use-cases/page.tsx` — real flows mapped to repo files.          |
| `/docs`                                         | `app/docs/page.tsx` — link hub into Typedoc, OpenAPI, and guides.    |
| `/agents` `/connectivity` `/ramps` `/superswap` | Pre-Phase-2 demo routes, kept intact.                                |

## Local dev

```bash
pnpm --filter @keeta-agent-stack/web dev
```

Or from the repo root:

```bash
pnpm dev:web
```

The dev server runs on port 3002.

## Build

```bash
pnpm --filter @keeta-agent-stack/web build
```

## Environment variables

Only the four `NEXT_PUBLIC_*` names below are read. Nothing else is allowed in the website's
environment.

| Variable                         | Default | Notes                                                                              |
| -------------------------------- | ------- | ---------------------------------------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_MODE`          | `true`  | When unset or truthy, the site never calls a backend.                              |
| `NEXT_PUBLIC_KEETA_API_BASE_URL` | _unset_ | Required to enable live mode in addition to setting `NEXT_PUBLIC_DEMO_MODE=false`. |
| `NEXT_PUBLIC_DASHBOARD_URL`      | _unset_ | Optional override for the dashboard link in the footer.                            |
| `NEXT_PUBLIC_DOCS_URL`           | _unset_ | Optional override for the docs link.                                               |

The website **must not** read or forward any of these:

- `KEETA_SIGNING_SEED`, `KEETA_KMS_PROVIDER`, `KEETA_KMS_KEY`, `KEETA_ACCOUNT_INDEX`,
  `GOOGLE_APPLICATION_CREDENTIALS`.
- `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, `AUTH_JWT_SECRET`, `MCP_ALLOW_INLINE_SEEDS`.
- Any `NEXT_PUBLIC_*KEY|TOKEN|SECRET|PASSWORD|CREDENTIAL` name.

These rules mirror the dashboard's existing security lint
([`apps/dashboard/scripts/lint-security.ts`](../dashboard/scripts/lint-security.ts)).

## Structure

```
app/         App Router pages.
components/
  site/      Header, footer, mobile nav, CTA section.
  sections/  Twelve homepage / page sections.
  motion/    Framer Motion (Motion for React) helpers.
  visual/    Decorative SVG and animated visuals.
content/     Typed copy and data modules — easy to grep, easy to translate.
lib/         cn, env, site-config, seo, demo-data, api-client.
public/      Static brand assets (no third-party logos).
```

## Live mode

When `NEXT_PUBLIC_DEMO_MODE=false` and `NEXT_PUBLIC_KEETA_API_BASE_URL` is provided,
`lib/api-client.ts` issues a single read-only GET to a public endpoint with a 4 s timeout. Any
failure transparently falls back to demo data so the page never hard-errors on a flaky network.

## License

Apache-2.0.
