# Contributing to Keeta Agent SDK

Thanks for your interest in improving the Keeta Agent SDK. This guide covers
how to get a working dev environment, the conventions we follow, and how to
ship a change end-to-end.

## TL;DR

```bash
pnpm install
docker compose up -d
cp .env.example .env
pnpm db:migrate
pnpm dev:all
```

Then in a separate terminal:

```bash
pnpm build
pnpm typecheck
pnpm lint
pnpm test
```

If all four pass and your change is documented, open a pull request.

## Code of Conduct

This project follows the [Contributor Covenant Code of Conduct](./CODE_OF_CONDUCT.md).
Be kind, focus on the work, and assume good intent.

## Project Layout

| Path                     | Purpose                                                         |
| ------------------------ | --------------------------------------------------------------- |
| `apps/api`               | Fastify control plane (HTTP API, OpenAPI, Swagger UI at `/docs`) |
| `apps/worker`            | BullMQ-driven execution / policy / simulation worker             |
| `apps/dashboard`         | Next.js dashboard with role-aware navigation                     |
| `apps/mcp`               | MCP server exposing typed tools to LLMs                          |
| `packages/agent-runtime` | `createKeetaAgent` factory + lifecycle hooks                     |
| `packages/sdk`           | Typed HTTP client                                                |
| `packages/types`         | Zod schemas + lifecycle types                                    |
| `packages/adapter-*`     | Per-venue adapters and registry                                  |
| `packages/policy`        | Policy engine, rules, composition                                |
| `packages/routing`       | Multi-hop route discovery and scoring                            |
| `packages/simulator`     | Simulation pipeline                                              |
| `packages/keeta`         | Keeta chain, transfer, oracle, and bond helpers                  |
| `packages/storage`       | Drizzle schema, repositories, migrations                         |
| `packages/telemetry`     | Logging, tracing, metrics                                        |
| `examples/*`             | Runnable reference agents                                        |
| `starter-agent-template` | Standalone agent boilerplate (no monorepo resolution)            |
| `docs/*`                 | Long-form documentation                                          |

## Branching & Commits

- Work on a topic branch off `main` (e.g. `feat/my-feature`,
  `fix/route-tiebreak`).
- Commit messages follow [Conventional Commits](https://www.conventionalcommits.org)
  (`feat:`, `fix:`, `docs:`, `chore:`, `refactor:`, `test:`).
- Keep PRs focused. Large refactors are easier to review when split into
  preparatory + behavioural commits.

## Issues & Pull Requests

- Use the GitHub issue templates for bugs and feature requests so reports
  include the reproduction details, environment, and docs impact we need.
- Use the pull request template to summarize behaviour changes, checks run,
  and any follow-up work.
- Do not open public issues for vulnerabilities or signing-key concerns.
  Follow [SECURITY.md](./SECURITY.md) instead.

## Required Local Checks

Run the same checks CI runs before opening a PR:

```bash
pnpm typecheck     # tsc --noEmit across every package and app
pnpm lint          # eslint
pnpm test          # vitest run for every package and app
pnpm build         # tsup / next / tsc builds
```

For changes that touch the API or worker pipeline, also run the integration
suite (it spins up the real API + worker against Postgres and Redis):

```bash
pnpm test:integration
```

For starter-template changes, run the smoke test:

```bash
pnpm dlx tsx starter-agent-template/scripts/smoke.ts
```

## Adding a New Adapter

Follow [`docs/creating-new-adapter.md`](./docs/creating-new-adapter.md). The
short version:

1. Copy [`packages/adapter-template`](./packages/adapter-template).
2. Implement `getQuote` and `execute` against your venue.
3. Add the contract suite (`runAdapterContractSuite`) once `execute(simulate)` is real.
4. Register the adapter in
   [`packages/adapter-registry/src/factory.ts`](./packages/adapter-registry/src/factory.ts)
   behind a `KEETA_ENABLE_*` env flag.
5. Update [`docs/capability-matrix.md`](./docs/capability-matrix.md).

## Working on the API or Worker

- New routes belong in `apps/api/src/routes/*` and must register in
  `apps/api/src/openapi.ts` so the `/docs` Swagger UI stays accurate.
- Schema changes need a Drizzle migration under
  `infrastructure/migrations/` and a matching update in
  `packages/storage/src/schema.ts`. Run `pnpm db:migrate` locally to verify.
- Worker stages (`quote`, `route`, `policy`, `execute`) read job timeouts
  from env vars defined in [`packages/config/src/bullmq.ts`](./packages/config/src/bullmq.ts).

## Working on the Dashboard

- The dashboard is server-first (Next.js App Router). Privileged data must
  load through server components, not the browser bundle.
- Never expose `OPS_API_KEY` via `NEXT_PUBLIC_*`; see
  [apps/dashboard/README.md](./apps/dashboard/README.md) and
  [apps/dashboard/docs/dashboard-v2-contract.md](./apps/dashboard/docs/dashboard-v2-contract.md)
  for the full contract.

## Working on MCP Tools

- Every tool must use a strict Zod schema and return the standard envelope
  (`{ ok, data?, error? }`) defined in
  [`apps/mcp/src/tools/error-envelope.ts`](./apps/mcp/src/tools/error-envelope.ts).
- Tools that touch signing material must respect `MCP_ALLOW_INLINE_SEEDS`
  (off by default) and fall back to the worker-held `KEETA_SIGNING_SEED`.

## Documentation

- Update the [README](./README.md) when public-facing APIs or workflows change.
- Add or refresh a section in [`docs/capability-matrix.md`](./docs/capability-matrix.md)
  for any change to adapter coverage or surface parity.
- Add a `CHANGELOG.md` entry under `## Unreleased` describing user-facing changes.
- For new long-form docs, drop them under `docs/` and link from the README's
  "Where to next" section or [`docs/README.md`](./docs/README.md).

## Security

If you find a security issue, follow [SECURITY.md](./SECURITY.md). Do not open
a public issue.

## Licensing

By contributing, you agree your contribution is licensed under
[Apache-2.0](./LICENSE).
