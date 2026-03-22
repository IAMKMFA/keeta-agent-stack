# keeta-agent-sdk

Production-oriented TypeScript monorepo for **adapter-first**, **simulation-first** execution of Keeta trading intents. Agents validate intents, gather quotes, score routes, enforce policy, simulate or execute, and persist telemetry—**without ever touching raw signing keys** (signing is injected at the infrastructure edge).

## Stack

- **pnpm** workspaces + **Turborepo**
- **Fastify** API (`apps/api`), **BullMQ** workers (`apps/worker`), **Next.js** dashboard (`apps/dashboard`)
- **PostgreSQL** + **Drizzle ORM**, **Redis**
- **Zod**, **Vitest**, **Pino**

## Repo layout

- `packages/types` — shared Zod schemas
- `packages/adapter-*` — venue adapters + registry
- `packages/wallet` — `Signer` boundary + dev signer
- `packages/keeta` — placeholder Keeta client (TODO: real SDK)
- `packages/policy`, `routing`, `simulator`, `storage`, `telemetry`, `agent-runtime`, `sdk`
- `infrastructure/migrations` — Drizzle SQL migrations
- `examples/*` — small CLI samples

## Security model

- **Agent runtime** only references the `Signer` **type** from `@keeta-agent-sdk/wallet`.
- **Never** import a concrete signer implementation inside agent logic.
- Production signing should use HSM/KMS or a dedicated signing service—**not** `DevSigner`.

## Adapter contract

Each adapter implementation should pass `runAdapterContractSuite` (see `packages/adapter-base/src/contract.ts`).

## Local development

1. **Install**

   ```bash
   pnpm install
   ```

2. **Infra**

   ```bash
   docker compose up -d
   cp .env.example .env
   ```

3. **Database**

   ```bash
   pnpm db:generate   # when schema changes
   pnpm db:migrate
   pnpm db:seed
   ```

4. **Run API + worker + dashboard**

   ```bash
   pnpm dev
   ```

   - API: `http://localhost:3001` (see `API_PORT`)
   - Dashboard: `http://localhost:3000`

5. **Quality**

   ```bash
   pnpm build
   pnpm test
   pnpm lint
   pnpm typecheck
   ```

## Environment

See [`.env.example`](.env.example). Key variables:

- `DATABASE_URL`, `REDIS_URL`
- `LIVE_MODE_ENABLED`, `ALLOW_DEV_SIGNER`
- `NEXT_PUBLIC_API_URL` for the dashboard

## Connecting the real Keeta SDK (later)

- Replace stubs in `packages/keeta` with official client types and RPC endpoints.
- Implement real `buildTransferTx` / `submitTx` and wire `Signer` to production hardware.
- Add live DEX / anchor adapters implementing `VenueAdapter` and register them in `AdapterRegistry`.
- Remove or gate `DevSigner`; enforce signing only in `apps/worker` or a sidecar with locked-down credentials.

## License

Apache-2.0 (default for OSS; change if your org requires otherwise).
