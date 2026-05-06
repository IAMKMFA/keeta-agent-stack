# Public Web API Integration

`apps/web` is designed to build and run without a backend. The default posture is safe demo mode:
all product flows render deterministic fixtures from `apps/web/lib/demo-data.ts` and visualizer demo
constants.

## Demo Mode

Demo mode is active when `NEXT_PUBLIC_DEMO_MODE` is unset or set to a truthy value such as `true`,
`1`, `yes`, or `on`.

In demo mode:

- no backend requests are attempted;
- `/demo` and the homepage interactive demo use local fixtures only;
- public API probes are marked `skipped`;
- builds do not require `apps/api`, Redis, Postgres, or a live Keeta signer.

## Live Mode

Live mode is opt-in only. It is active only when both are true:

- `NEXT_PUBLIC_DEMO_MODE=false`
- `NEXT_PUBLIC_KEETA_API_BASE_URL` is a valid `http` or `https` URL

When live mode is active, the website probes public read-only endpoints with short timeouts. These
probes are used only for status and ticker context. The pipeline demo remains deterministic fixture
data until a confirmed public demo endpoint exists.

Every fetch:

- uses `GET`;
- omits credentials;
- sends no authorization headers;
- times out;
- catches network, HTTP, timeout, and parse failures;
- falls back to demo data.

## Public Environment Variables

Allowed frontend env vars:

| Variable                         | Purpose                                                     |
| -------------------------------- | ----------------------------------------------------------- |
| `NEXT_PUBLIC_DEMO_MODE`          | Defaults to demo mode when unset or truthy.                 |
| `NEXT_PUBLIC_KEETA_API_BASE_URL` | Optional public API base URL for read-only status probes.   |
| `NEXT_PUBLIC_DASHBOARD_URL`      | Optional public link target for the operator dashboard CTA. |
| `NEXT_PUBLIC_DOCS_URL`           | Optional public link target for docs CTA.                   |

`apps/web/lib/env.ts` reads only `NEXT_PUBLIC_*` variables and validates URL protocols to `http` or
`https`.

## Safe Endpoint Assumptions

The current client defensively probes:

- `GET /health`
- `GET /status`
- `GET /openapi.json`

These routes may or may not exist on a deployment. Missing or invalid endpoints are expected and
render as fallback state.

`/metrics` is not probed by default because metrics endpoints often include operational detail that
may not be appropriate for a public website. Add it only after the backend exposes a deliberately
public-safe metrics summary.

## Backend Endpoints To Confirm

Before replacing demo fixtures with live public data, confirm or add public-safe API routes for:

- a redacted platform status summary;
- a redacted adapter/capability summary;
- a read-only demo pipeline snapshot with no wallet addresses, signer data, tokens, or operator
  credentials;
- a public-safe metrics summary that excludes secrets, tenant identifiers, queue internals, and
  privileged operational data.

Do not assume private API routes are safe just because they return JSON.

## Forbidden In Frontend

Never expose or read these in `apps/web`:

- signing seeds;
- private keys;
- KMS key material;
- `KEETA_SIGNING_SEED`;
- `OPS_API_KEY`;
- `ADMIN_BYPASS_TOKEN`;
- JWT signing secrets;
- webhook secrets;
- database URLs;
- Redis URLs;
- operator credentials;
- privileged API tokens.

Do not add backend-only values to `NEXT_PUBLIC_*` variables.

## Rollout Plan

1. Keep demo mode as the default and production-safe fallback.
2. Enable live mode in a non-production preview with only `/health`, `/status`, and `/openapi.json`.
3. Confirm response shapes and redact any backend metadata that should not be public.
4. Add a dedicated public demo snapshot endpoint if needed.
5. Add schema validation for that endpoint in `apps/web/lib/api-client.ts`.
6. Only then render live public demo data, still with timeout and fallback behavior.
