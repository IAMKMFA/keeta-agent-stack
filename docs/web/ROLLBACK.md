# Web Rollback

This guide covers reverting or disabling a bad `apps/web` deployment.

## Fastest Safe Rollback

In Vercel:

1. Open the project for `apps/web`.
2. Go to Deployments.
3. Select the last known-good production deployment.
4. Choose **Promote to Production**.
5. Verify `/`, `/demo`, `/security`, and `/docs`.

This does not require a code change and is the preferred rollback path for a broken website deploy.

## Disable Live API Mode

If the website is healthy but public API probes are failing or confusing users, switch back to demo
mode:

```bash
NEXT_PUBLIC_DEMO_MODE=true
```

Remove or leave unused:

```bash
NEXT_PUBLIC_KEETA_API_BASE_URL
```

Redeploy after changing env. Demo mode does not require a backend and should continue serving local
fixtures.

## Revert a Commit

If the bad deployment came from a code change:

```bash
git revert <commit-sha>
git push
```

Let Web CI run before promoting the new deployment.

## Preview Before Re-Promoting

For the rollback or forward fix, verify:

```bash
pnpm lint:web
pnpm typecheck:web
pnpm build:web
pnpm test:web:e2e
```

Then inspect the Vercel preview deployment. Keep `NEXT_PUBLIC_DEMO_MODE=true` in previews unless a
preview API origin has been reviewed as public-safe.

## What Not To Do

- Do not add backend secrets to `NEXT_PUBLIC_*` variables.
- Do not point the public website at admin-only API routes.
- Do not expose `OPS_API_KEY`, `ADMIN_BYPASS_TOKEN`, signing seeds, private keys, or service-account
  credentials to recover a deployment.
- Do not disable CI to force a production deployment.
