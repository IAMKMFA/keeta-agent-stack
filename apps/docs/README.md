# Keeta Agent SDK Docs

Build the static docs bundle with:

```bash
pnpm --filter @keeta-agent-sdk/docs build
```

The generated site lands in `apps/docs/dist` and includes:

- A lightweight multi-page docs site
- Getting-started, adapter, policy, operations, and architecture guides
- Endpoint group summaries and a static OpenAPI snapshot
- A static OpenAPI snapshot at `dist/openapi.json`

The live API also serves the current spec at `GET /openapi.json`.
