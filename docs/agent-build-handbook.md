# Agent Build Handbook

This is the handoff guide for AI agents, automation runners, and new engineers who need to clone,
build, inspect, and extend the Keeta Agent Stack without tribal knowledge.

## Contract

- Runtime: Node.js 22 and pnpm 9.15.4.
- Package manager: use the pinned `packageManager` value from the root `package.json`.
- Install: `pnpm install --frozen-lockfile` for CI or agent runs; use plain `pnpm install` only when
  intentionally updating dependencies.
- Build proof: `pnpm verify:agent` from the repo root.
- Build discipline: run one build-producing command at a time. Package builds clean and rewrite
  `dist/`, so parallel commands such as `pnpm test:integration` and `starter-agent-template` smoke
  can race locally even when the sequential CI path is healthy.
- Live signing: never put `KEETA_SIGNING_SEED` in SDK, dashboard, browser, or agent code. The worker
  owns it.
- Npm status: `@keeta-agent-stack/*` is not published yet. Consume packages through the workspace or
  the starter template smoke flow until the scope is released.

## Fresh Clone

```bash
git clone https://github.com/IAMKMFA/keeta-agent-stack.git
cd keeta-agent-stack
pnpm install --frozen-lockfile
pnpm verify:agent
```

`pnpm verify:agent` runs the same high-signal build checks agents should care about: formatting,
typecheck, lint, unit tests, workspace build, static docs build, and publishable package validation.

## Local Stack

```bash
cp .env.example .env
docker compose up -d
pnpm db:migrate
pnpm db:seed
pnpm dev:all
```

Default surfaces:

| Surface   | URL / command                                 | Purpose                                     |
| --------- | --------------------------------------------- | ------------------------------------------- |
| API       | `http://localhost:3001`                       | Fastify control plane                       |
| Swagger   | `http://localhost:3001/docs`                  | Live OpenAPI UI                             |
| Dashboard | `http://localhost:3000`                       | Operator cockpit                            |
| MCP       | `pnpm dev:mcp` or included in `pnpm dev:all`  | Tool surface for LLM workflows              |
| Docs      | `pnpm --filter @keeta-agent-stack/docs build` | Static docs + `apps/docs/dist/openapi.json` |
| Demo      | `pnpm demo`                                   | One-command local pipeline exercise         |

## Reading Order

1. [`README.md`](../README.md) for product shape, quick start, and examples.
2. [`docs/capability-matrix.md`](./capability-matrix.md) for what is live, synthetic, or future.
3. [`apps/mcp/TOOLS.md`](../apps/mcp/TOOLS.md) for the generated MCP tool catalog.
4. [`docs/sdk-reference.md`](./sdk-reference.md) for OpenAPI, Typedoc, and runtime return semantics.
5. [`docs/deployment.md`](./deployment.md) for production topology and secret boundaries.
6. [`starter-agent-template/README.md`](../starter-agent-template/README.md) for a standalone agent
   scaffold.

## Service Map

| Path                     | Owns                                                          |
| ------------------------ | ------------------------------------------------------------- |
| `packages/types`         | Zod schemas and shared lifecycle contracts                    |
| `packages/sdk`           | Typed HTTP client for external agents                         |
| `packages/agent-runtime` | `createKeetaAgent`, lifecycle hooks, SDK-backed orchestration |
| `packages/routing`       | Multi-hop route discovery, scoring, route explanations        |
| `packages/policy`        | Default/custom rules, toggles, and composition                |
| `packages/simulator`     | Standard, shadow, and replay simulation modes                 |
| `packages/adapter-*`     | Venue adapters and adapter templates                          |
| `packages/keeta`         | Keeta client, transfer, oracle, and anchor-bond helpers       |
| `packages/storage`       | Drizzle schema, repositories, migrations, audit data          |
| `apps/api`               | Fastify API, OpenAPI, auth, metrics, and queue enqueueing     |
| `apps/worker`            | BullMQ execution stages and worker-held signing path          |
| `apps/mcp`               | MCP tools for agent/operator workflows                        |
| `apps/dashboard`         | Next.js operator UI                                           |
| `apps/docs`              | Static docs bundle and OpenAPI snapshot generator             |
| `examples/*`             | Runnable reference agents and integration patterns            |
| `templates/*`            | Larger opinionated agent templates                            |

## Change Workflow

1. Read the package `README.md` and nearest tests before editing.
2. Keep changes scoped to the service or package that owns the behavior.
3. Update `docs/capability-matrix.md` when API, SDK, MCP, adapter, or live/synthetic coverage
   changes.
4. Regenerate MCP tools after MCP schema edits:

   ```bash
   pnpm --filter @keeta-agent-stack/mcp docs:tools
   ```

5. Regenerate docs when OpenAPI or public docs content changes:

   ```bash
   pnpm --filter @keeta-agent-stack/docs build
   ```

6. Run focused checks first, then `pnpm verify:agent` before pushing.

## Focused Checks

| Change type                 | Minimum checks                                                                                            |
| --------------------------- | --------------------------------------------------------------------------------------------------------- |
| Package or type change      | `pnpm --filter <package> typecheck && pnpm --filter <package> test`                                       |
| API route or OpenAPI change | `pnpm --filter @keeta-agent-stack/api typecheck && pnpm test:integration`                                 |
| Worker pipeline change      | `pnpm --filter @keeta-agent-stack/worker test && pnpm test:integration`                                   |
| MCP tool change             | `pnpm --filter @keeta-agent-stack/mcp test && pnpm --filter @keeta-agent-stack/mcp docs:tools`            |
| Dashboard change            | `pnpm --filter @keeta-agent-stack/dashboard typecheck && pnpm --filter @keeta-agent-stack/dashboard test` |
| Docs-only change            | `pnpm format:check && pnpm --filter @keeta-agent-stack/docs build`                                        |
| Dependency update           | `pnpm install --frozen-lockfile && pnpm verify:agent`                                                     |

## Safety Boundaries

- Treat `mode: "live"` as money movement. Keep live execution behind policy and worker signing.
- Keep `MCP_ALLOW_INLINE_SEEDS=false` outside local experiments.
- Keep `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, and JWT/OIDC secrets server-side.
- Do not mark synthetic adapters as live. The live adapters today are `adapter-keeta-transfer` and
  `adapter-oracle-rail` when configured.
- Keep generated output out of commits unless the repo explicitly tracks it. `docs/typedoc/` and
  `dist/` outputs are ignored.

## Common Recovery

| Symptom                                       | Fix                                                                                  |
| --------------------------------------------- | ------------------------------------------------------------------------------------ |
| Install differs from CI                       | Run `pnpm install --frozen-lockfile`; commit lockfile changes only when intentional. |
| `TOOLS.md` is stale                           | Run `pnpm --filter @keeta-agent-stack/mcp docs:tools`.                               |
| OpenAPI snapshot is stale                     | Run `pnpm --filter @keeta-agent-stack/docs build`.                                   |
| Integration tests cannot reach Postgres/Redis | Start `docker compose up -d` and confirm ports `5432` and `6379`.                    |
| Dashboard auth behaves differently locally    | Compare `.env` with `.env.example`, especially auth and dashboard flags.             |

## Ship Checklist

- `pnpm install --frozen-lockfile`
- `pnpm verify:agent`
- `pnpm test:integration` for API, worker, storage, adapter, or execution changes
- `pnpm --filter @keeta-agent-stack/mcp docs:tools` for MCP changes
- Docs and `CHANGELOG.md` updated for public behavior changes
