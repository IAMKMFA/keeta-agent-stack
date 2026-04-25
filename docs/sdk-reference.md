# SDK Reference & OpenAPI

The Keeta Agent Stack exposes two complementary reference surfaces. This page is also the front
matter that Typedoc renders at the top of the generated HTML site.

## OpenAPI (live API control plane)

The Fastify API under `apps/api` emits a fully-typed OpenAPI 3.1 document on every boot. Two
endpoints are wired into every environment:

| Endpoint            | Purpose                                                                                                                                                                                                                 |
| ------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| `GET /openapi.json` | Raw spec, cached for 5 minutes via `cache-control: public, max-age=300`.                                                                                                                                                |
| `GET /docs`         | Swagger UI backed by [`@fastify/swagger-ui`](https://www.npmjs.com/package/@fastify/swagger-ui). Try-It-Out is enabled by default outside production and can be explicitly gated with `API_SWAGGER_TRY_IT_OUT_ENABLED`. |

### Try it locally

```bash
pnpm dev:all
# then open http://localhost:3001/docs
```

In local development you should be able to expand `/me`, `/intents`, and `/anchors/health`, click
**Try it out**, and execute a request directly against the running API.

### Publish to a static host

The repo ships a small static docs bundle that includes the canonical OpenAPI snapshot:

```bash
pnpm --filter @keeta-agent-stack/docs build
```

The bundle is written to `apps/docs/dist/`. GitHub Pages publishes the same output only when the
repository variable `ENABLE_GITHUB_PAGES=true`; set `PUBLIC_SANDBOX_URL` if you want the generated
docs to point at a live API instead of `http://localhost:3001`.

`buildOpenApiDocument()` in `apps/api/src/openapi.ts` is also pure, so custom docs pipelines can
call it directly and write the result to disk:

```ts
import { writeFileSync } from 'node:fs';
import { buildOpenApiDocument } from '@keeta-agent-stack/api/openapi';
writeFileSync(
  'openapi.json',
  JSON.stringify(buildOpenApiDocument({ serverUrl: 'https://api.your.tld' }), null, 2)
);
```

Drop the resulting file into your public docs site or hand it to a downstream code-generator.

## Typedoc (typed SDK + agent runtime + shared types)

Typedoc renders the public TypeScript surface of the publishable packages:

- [`@keeta-agent-stack/sdk`](../packages/sdk/README.md) — typed HTTP client (`createClient`,
  request/response types).
- [`@keeta-agent-stack/agent-runtime`](../packages/agent-runtime/README.md) — `createKeetaAgent`,
  `AgentRuntime`, hook types.
- [`@keeta-agent-stack/types`](../packages/types/README.md) — shared Zod schemas (intent, route
  plan, simulation, policy, events).

### Generate

```bash
pnpm docs:generate
```

Output is written to `docs/typedoc/` (gitignored). Open `docs/typedoc/index.html` in your browser,
or serve it with any static file server.

### Agent runtime live results

`createKeetaAgent({ sdk })` walks a live intent through quote, route, policy, and execute. The
runtime returns `kind: "executed"` or `kind: "failed"` only after observing a terminal execution
event. If no terminal event arrives before the polling timeout, it returns `kind: "pending"` with
the observed event list so callers can continue watching through `sdk.subscribeEvents(...)` or
`sdk.listEvents(...)`.

### Publish

`pnpm docs:publish` is a placeholder — point it at `gh-pages`, an S3 bucket, or your internal docs
platform. We deliberately leave hosting unopinionated so you can choose between:

- [`gh-pages`](https://www.npmjs.com/package/gh-pages) for an opinionated GitHub Pages publish.
- `aws s3 sync docs/typedoc/ s3://your-bucket/keeta-sdk/` for cloud hosting.
- Vercel / Netlify static hosting via `docs/typedoc/` as the deploy directory.

## Cross-references

- The 10-minute tutorial in the root
  [`README`](../README.md#build-your-first-trading-agent-in-10-minutes) uses both surfaces.
- The MCP-driven LLM walkthroughs live in
  [`examples/mcp-llm-integration.md`](../examples/mcp-llm-integration.md).
- Production wiring (env, scaling, security) is in [`docs/deployment.md`](./deployment.md).
