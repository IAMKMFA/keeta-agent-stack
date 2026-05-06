# Website Security Claims — Phase 1

> The set of security-flavoured statements the future `apps/web` site is allowed to make today,
> derived from `SECURITY.md`, `docs/security/CUSTODY_GUARD_AUDIT.md`,
> `docs/security/SECRET_BOUNDARY_MAP.md`, and the existing `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md`.
>
> This document is a **claim allowlist**, not a copywriting guide. Every line of marketing copy on
> the website that touches security must pass two tests:
>
> 1. **Map.** It corresponds to a row in this file (or in `SECURITY_WEBSITE_CLAIM_MAP.md`) marked
>    safe to claim today.
> 2. **Link.** It links to the canonical evidence (`SECURITY.md` anchor, audit row, or repo file) so
>    a reader can verify it.

---

## 1. Operating Principles

These are the Phase 1 rules a `/security` page on `apps/web` must follow. They are derived from the
operating principles section at the bottom of `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md` and apply to
**every** page on the site, not just `/security`.

1. **Underclaim and overprove.** No "the only signer is the worker" absolute statements; instead,
   "in the canonical execution pipeline, the worker is the signer; signing-class MCP tools are off
   by default."
2. **No paraphrase as absolutes.** Marketing copy must mirror the qualifier language used in
   `SECURITY.md`. If the canonical doc says "default" or "by default", the website cannot upgrade
   that to "guaranteed" or "always".
3. **Link, don't restate.** Contact channels, disclosure timeline, and rotation procedure live in
   `SECURITY.md` — the website links, it does not re-author.
4. **Treat audit docs as the gate.** Before any new security claim ships, a row must exist in this
   file or in `SECURITY_WEBSITE_CLAIM_MAP.md` and be marked **safe today**.
5. **No fabricated certifications, audits, or compliance attestations.** No SOC 2 / ISO 27001 / PCI
   badges unless and until we actually have them. No "audited by" language without a public report
   URL.

---

## 2. Claim Allowlist (Safe to Ship Today)

Each row carries a phrasing template. Marketing may rewrite the copy **inside** the template's truth
budget; it may not inflate the claim.

| #   | Topic                                                           | Template (paraphrasable, do not amplify)                                                                                                                            | Backing evidence                                                                                                                                                                                  |
| --- | --------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | Open source                                                     | "The Keeta Agent Stack is fully open source under Apache-2.0. You can audit every line."                                                                            | Repo URL `https://github.com/IAMKMFA/keeta-agent-stack`, `LICENSE`.                                                                                                                               |
| 2   | Disclosure                                                      | "We accept private security reports through GitHub Security Advisories and aim to acknowledge within three business days."                                          | `SECURITY.md` § _Reporting a Vulnerability_.                                                                                                                                                      |
| 3   | Coordinated disclosure                                          | "We follow standard coordinated disclosure with a default 90-day timeline."                                                                                         | `SECURITY.md` § _Coordinated Disclosure_.                                                                                                                                                         |
| 4   | Signing boundary (qualified)                                    | "In our canonical execution pipeline, only the worker process holds Keeta signing material. The API, dashboard, and public website never see it."                   | `SECURITY.md` § _Signing Key & Inline-Seed Policy_; `apps/api/src/server.ts:buildApiApp` (`assertEnvNotPresentForRuntime`); `packages/keeta/src/worker-bridge.ts` (`assertWorkerSigningRuntime`). |
| 5   | MCP inline seeds default                                        | "The MCP server rejects inline seed arguments by default. Setting `MCP_ALLOW_INLINE_SEEDS=true` is the explicit dev opt-in and is not recommended in production."   | `apps/mcp/src/tools/execute.ts`, `apps/mcp/src/tools/anchor-chaining.ts`, `apps/mcp/fly.toml`.                                                                                                    |
| 6   | Logging redaction                                               | "Seed material and admin tokens are redacted from logs by default through Pino's deny-list."                                                                        | `packages/telemetry/src/logger.ts` (`DEFAULT_REDACT_PATHS`).                                                                                                                                      |
| 7   | Admin bypass posture                                            | "`ADMIN_BYPASS_TOKEN` is disabled in production unless an operator explicitly opts in."                                                                             | `apps/api/src/lib/auth.ts` (`adminBypassAllowed`); `packages/config/src/index.ts`.                                                                                                                |
| 8   | Operator role default                                           | "The legacy `OPS_API_KEY` defaults to operator-only access. Admin mutations require the `admin` role."                                                              | `apps/api/src/lib/auth.ts` (`legacyOpsKeyRole`, `requireAdminAccess`).                                                                                                                            |
| 9   | Dashboard browser-side keys                                     | "Operator API keys never enter the dashboard's browser bundle. CI lint fails the build if they do."                                                                 | `apps/dashboard/scripts/lint-security.ts`; `apps/dashboard/app/api/events/stream/route.ts`.                                                                                                       |
| 10  | `NEXT_PUBLIC_*` denylist (dashboard)                            | "The dashboard's CI lint forbids any `NEXT_PUBLIC_*KEY/TOKEN/SECRET/PASSWORD/CREDENTIAL` env name in any `.env*` file."                                             | `apps/dashboard/scripts/lint-security.ts` rule "next-public-secret".                                                                                                                              |
| 11  | Dev-signer guard                                                | "The worker refuses to boot in production if `ALLOW_DEV_SIGNER=true`."                                                                                              | `packages/config/src/index.ts:158-160`.                                                                                                                                                           |
| 12  | Webhook signing                                                 | "Webhook deliveries are signed with a per-subscription HMAC secret stored server-side."                                                                             | `apps/worker/src/run.ts` (webhook delivery worker).                                                                                                                                               |
| 13  | Kill switch                                                     | "Operators can stop live execution instantly via the kill switch (env or DB setting). The worker re-checks before every job."                                       | `apps/worker/src/run.ts` (`killSwitchActive`); `packages/config/src/index.ts`.                                                                                                                    |
| 14  | KMS-backed signing                                              | "We support BYOK signing via Google Cloud KMS, where the private key never leaves Cloud KMS. We recommend rotating to KMS in production."                           | `packages/keeta/src/signer/gcp-kms-signer.ts` and tests; `SECURITY.md` § _KMS-backed signing_.                                                                                                    |
| 15  | RBAC at API layer                                               | "Operator roles are enforced at the API layer (viewer, operator, admin) on every protected route."                                                                  | `apps/api/src/lib/auth.ts`; `apps/api/src/routes/*.ts`.                                                                                                                                           |
| 16  | JWT support                                                     | "Our JWT verification supports HS, RS, JWKS, and OIDC discovery."                                                                                                   | `apps/api/src/lib/auth.ts` (`jwtVerifierConfig`).                                                                                                                                                 |
| 17  | Anchor bond reconciliation                                      | "Anchor bonds are reconciled on a schedule and on-demand."                                                                                                          | `apps/worker/src/run.ts` (anchor-bond reconciliation worker); `packages/keeta/src/anchor-bonds.ts`.                                                                                               |
| 18  | Mock vs live posture                                            | "Operators can see at a glance whether they are running mock adapters or live execution from inside the dashboard."                                                 | `apps/dashboard/components/DemoBadge.tsx` and equivalents; `MOCK_ADAPTERS`, `LIVE_MODE_ENABLED` env flags.                                                                                        |
| 19  | No `@keeta-agent-stack/*` package reads the seed at import time | "No published package in our SDK family reads `KEETA_SIGNING_SEED` at import time."                                                                                 | `SECURITY_WEBSITE_CLAIM_MAP.md` row 2; manual grep audit recorded in `docs/web/SECURITY_WEBSITE_CLAIM_MAP.md`.                                                                                    |
| 20  | Custody guard runtime checks                                    | "A small `@keeta-agent-stack/custody-guards` package enforces these boundaries at runtime — wrong-runtime signing throws, browser-secret env names refuse to boot." | `packages/custody-guards/src/{custody-boundary,env-classifier,errors,redact,runtime}.ts`; `packages/custody-guards/src/custody-boundary.test.ts`.                                                 |

---

## 3. Claims Not Safe to Ship Today

Anything in this section is **prohibited** until the listed gating work is done. Any draft copy that
even resembles these statements must be rewritten or moved to a "Roadmap" subsection that explicitly
labels it as future work.

| #   | Topic                                                                           | What's missing                                                                                                                           | Where to track                                                             |
| --- | ------------------------------------------------------------------------------- | ---------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------- |
| A   | "We are SOC 2 / ISO 27001 / PCI compliant."                                     | We have no audit. Do not add badges.                                                                                                     | Future engagement decision.                                                |
| B   | "Independent third-party security audit."                                       | Not commissioned.                                                                                                                        | Future.                                                                    |
| C   | "Bug bounty rewards."                                                           | We do not run a paid bounty (`SECURITY.md` says so). We **may** say "we credit reporters".                                               | `SECURITY.md` § _Coordinated Disclosure_.                                  |
| D   | "Seeds never leave the MCP host."                                               | False today: `keeta_wallet_create_or_import` and `keeta_generate_seed` return raw seeds in tool transcript content.                      | `SECURITY_WEBSITE_CLAIM_MAP.md` row 14, `apps/mcp/src/tools/bootstrap.ts`. |
| E   | "Extending the redact list with `LOG_REDACT_EXTRA`."                            | Documentation drift — the env is actually `TELEMETRY_EXTRA_REDACT_PATHS`.                                                                | `docs/security/CUSTODY_GUARD_AUDIT.md` P1.                                 |
| F   | "Any `NEXT_PUBLIC_*` secret name fails the build of `apps/web`."                | The lint exists for the dashboard only. The website lint is not yet wired.                                                               | Future website phase.                                                      |
| G   | "Worker boot fails if it sees a public Base RPC URL in production."             | Specific to a base-evm plugin scoped under `.cursor/rules/`; not shipped in core repo. Do not claim.                                     | Plugin work.                                                               |
| H   | "Tested production walkthrough for AWS KMS signer."                             | Doc not published yet (`docs/deployment/aws-kms-signer.md`).                                                                             | Future deployment doc.                                                     |
| I   | "Signed by a hardware security module."                                         | Cloud KMS is supported; HSM language is not.                                                                                             | Future.                                                                    |
| J   | "Audit log is tamper-proof / append-only / blockchain-anchored."                | We have audit rows and pino redaction; no append-only guarantee.                                                                         | Future.                                                                    |
| K   | "The website is built without any tracking, analytics, or third-party scripts." | This may end up true, but it is a **product** decision that must be enforced by code review and CI. Do not claim until that gate exists. | Future.                                                                    |
| L   | "Zero downtime guarantee."                                                      | We make no SLA.                                                                                                                          | Future.                                                                    |
| M   | Vendor / partner / institutional logos.                                         | None confirmed. Do not display third-party logos without written permission.                                                             | Future business work.                                                      |

---

## 4. Wording Conventions

A short style sheet so security copy on the website stays consistent.

- **"Worker"** is the canonical signer. The website always says _worker_, not _the signer_, _the
  wallet_, or _our service_.
- **"Default"** and **"by default"** are load-bearing words. They mean an operator can change the
  behaviour. Replace them with _always_ / _guaranteed_ only when an enforcement guard makes the
  alternative impossible.
- **"Recommend"** / **"production-recommended"** — appropriate for KMS, kill-switch, and audit log
  retention. Never use for paid features that don't exist.
- **"Audit log"** — refers to the pino-logged audit rows. We do not call it an "immutable audit
  trail" without an immutability primitive.
- **"Self-hostable"** — true; the stack ships Docker Compose and Fly config. Acceptable.
- **"BYOK"** — only for the GCP KMS path today.

---

## 5. Review Checklist Before Each `/security` Page Change

A checklist to drop into the PR template when touching `/security` or any security-flavoured
marketing copy:

- [ ] Every claim maps to a numbered row in this file (or in `SECURITY_WEBSITE_CLAIM_MAP.md`).
- [ ] Every claim links to its evidence.
- [ ] No third-party logo, badge, or compliance mark is added.
- [ ] No claim from § 3 (the prohibited list) is paraphrased into the page.
- [ ] All `default` / `by default` qualifiers are preserved.
- [ ] The page does not call live API endpoints from the browser with admin credentials.
- [ ] If a new claim is needed, a new row is added to this file first, in the same PR, with a
      working evidence link.
