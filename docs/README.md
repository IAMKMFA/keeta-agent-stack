# Documentation Index

This folder holds the long-form reference material for the Keeta Agent SDK.
Use this page as the fastest route to the right guide.

## Start Here

| If you want to... | Open |
| --- | --- |
| Understand the product surface quickly | [../README.md](../README.md) |
| See API docs and generated SDK reference entrypoints | [sdk-reference.md](./sdk-reference.md) |
| Plan a production deployment | [deployment.md](./deployment.md) |
| Build a new venue integration | [creating-new-adapter.md](./creating-new-adapter.md) |
| Check API / SDK / MCP parity | [capability-matrix.md](./capability-matrix.md) |
| Review near-term platform direction | [next-steps-roadmap.md](./next-steps-roadmap.md) |
| Read the higher-level architecture narrative | [keeta-agent-sdk.md](./keeta-agent-sdk.md) |

## Generated References

- `pnpm docs:generate` builds Typedoc HTML into `docs/typedoc/`.
- `pnpm --filter @keeta-agent-sdk/docs build` builds the static docs site in
  `apps/docs/dist`.
- `pnpm dev:all` serves Swagger UI at `http://localhost:3001/docs`.

## GitHub-Friendly Reading Order

1. Start with the root [README](../README.md).
2. Jump to [sdk-reference.md](./sdk-reference.md) for API and Typedoc entrypoints.
3. Use [deployment.md](./deployment.md) if you are operating the stack.
4. Use [creating-new-adapter.md](./creating-new-adapter.md) if you are extending the platform.

## Related Files

- [../CONTRIBUTING.md](../CONTRIBUTING.md)
- [../SECURITY.md](../SECURITY.md)
- [../CHANGELOG.md](../CHANGELOG.md)
- [../starter-agent-template/README.md](../starter-agent-template/README.md)
