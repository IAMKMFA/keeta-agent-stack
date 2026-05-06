# PayAI × Keeta Inspiration Map — Phase 1

> Maps the **structural rhythm** that PayAI.network uses for its product narrative onto the
> **thematic vocabulary** that Keeta.com uses for its trust-and-scale story, and lands on a layout
> the Keeta Agent Stack website at `apps/web` can ship without copying anything from either site.

---

## Hard Rule — No Copying

This document is an **inspiration map**, not a clone manifest. The website may not:

- **Copy text.** No headlines, subheads, body copy, button copy, FAQ questions/answers, or microcopy
  may be lifted from `payai.network`, `keeta.com`, or any other site. All copy on `apps/web` must be
  original and grounded in features that this repo actually ships.
- **Copy images, logos, illustrations, animations, or videos.** The Keeta wordmark we display is our
  own usage of our own brand; we do not repost any visual asset from a third party. PayAI's mascot
  and any of its product illustrations are off-limits.
- **Copy exact layouts.** Section _order_ and section _type_ (hero, trust strip, modules, metrics,
  etc.) are abstract design vocabulary that any modern product site uses; the **exact spacing, exact
  proportions, and pixel-level layout** of any specific PayAI or Keeta page is not. Future visual
  regression tests should compare to our own Storybook fixtures, not to either external site.
- **Copy proprietary brand expressions.** Tag-lines, naming systems (e.g. "Super Swap" / "Ramps" /
  "Connectivity" / "Agents" already in `apps/web/components/Nav.tsx` are our own neutral category
  labels and are fine), animation choreography, or signature gradients tied to another company's
  identity are off-limits.

If a copy review or a design review surfaces material that looks too close to either site, the
default is to rewrite it from the repo evidence. The repo is the source of truth.

---

## 1. PayAI-inspired Structural Rhythm

PayAI's site has a clear product-marketing cadence that suits a developer + operator audience. We
borrow only the **section sequence**:

| #   | Section type        | Job-to-be-done                                                   | What our site puts here                                                                                                                                                                                                                |
| --- | ------------------- | ---------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| 1   | **Hero**            | One-liner of what the stack does and the strongest CTA.          | Headline that names the agent execution layer; secondary line summarises the Intent → Quote → Route → Policy → Simulate → Execute → Audit pipeline; CTAs to `Run it locally` (existing GitHub anchor) and `Read the docs`.             |
| 2   | **Trust strip**     | A row of low-volume signals (logos, runtime stats, audit links). | Open-source badge, Apache-2.0 licence chip, link to `SECURITY.md`, "MCP-ready" chip, optional Keeta network status pill. No fabricated logos or fake partner marks.                                                                    |
| 3   | **Product modules** | Two- to three-line summaries of each pillar.                     | One card per stack pillar — SDK, API control plane, Worker, Dashboard, MCP, Agent runtime, Routing, Policy, Simulator, Events/Webhooks/Metrics, Keeta adapter, Examples. Each card links to its own deep-dive page.                    |
| 4   | **Metrics**         | Real numbers that quantify the product surface.                  | Counts derived from the repo: `# adapters`, `# packages`, `# example agents`, `# MCP tools`, `# policy rules` — all sourced statically at build time. No fake KPI numbers.                                                             |
| 5   | **Ecosystem cards** | Where this product fits with adjacent tooling.                   | Cards for Keeta network, KMS providers (GCP today, AWS planned via `docs/deployment/aws-kms-signer.md`), MCP-compatible LLMs, Drizzle / Postgres / Redis / BullMQ runtime, Next.js dashboard. Each card is a link, not a logo gallery. |
| 6   | **Developer CTA**   | Concrete onboarding for engineers.                               | Three-step "Get running in 10 minutes" panel: clone repo → `pnpm install && pnpm dev` → `pnpm demo`. Plus Quickstart link, MCP Quickstart link, and starter-agent-template link.                                                       |
| 7   | **FAQ**             | Anticipated objections answered with linked evidence.            | Original questions about custody (link to `SECURITY.md` boundary diagram), live vs mock posture (link to `LIVE_MODE_ENABLED` docs), self-hosting cost, supported networks, contributor expectations.                                   |
| 8   | **Final CTA**       | Last conversion surface above the footer.                        | Two CTAs side-by-side — "Run it locally" (repo) and "Talk to maintainers" (GitHub Discussions / Security advisories).                                                                                                                  |

We are **not** lifting PayAI's specific copy, illustrations, button shapes, gradient stops, or
motion timing. The structural cadence above is a generic product-marketing pattern; the realised
page must look and read like the Keeta Agent Stack.

---

## 2. Keeta-inspired Thematic Vocabulary

Keeta.com's institutional/developer story is built around a small set of repeated themes. We adopt
the **vocabulary** to ground our copy in the network's identity, and we ground each theme in
concrete repo evidence so the copy is defensible.

| Keeta theme                   | Website angle                                                                                                                                                     | Repo evidence we ground it in                                                                                                                                  |
| ----------------------------- | ----------------------------------------------------------------------------------------------------------------------------------------------------------------- | -------------------------------------------------------------------------------------------------------------------------------------------------------------- |
| **Unifying layer**            | The agent stack is a unifying execution layer that sits across rails — native Keeta KTA transfers, mock CEX/DEX/anchor venues, MPP, x402, Pay.sh, oracle rails.   | `packages/adapter-registry`, `packages/adapter-{base,keeta-transfer,mpp,pay-sh,x402,oracle-rail,mock-anchor,mock-cex,mock-dex}`.                               |
| **Institutions / Developers** | Two front doors. Institutions get policy packs, KMS-backed signing, audit trails, kill switch. Developers get an open-source SDK + MCP server + starter template. | `packages/policy/{packs,rules}`, `packages/keeta/src/signer/`, `apps/api/src/routes/policy-admin.ts`, `apps/dashboard`, `starter-agent-template/`, `apps/mcp`. |
| **Compliance**                | Policy engine with named packs, RBAC at the API layer, redacted audit logs, signed webhooks.                                                                      | `packages/policy/`, `apps/api/src/lib/auth.ts`, `packages/telemetry/src/logger.ts` redaction, `apps/worker/src/run.ts` HMAC delivery.                          |
| **Tokenization**              | Asset-aware adapters with chain-aware asset IDs (`KTA_BASE` ≠ `KTA_NATIVE`) and conformance tests.                                                                | `packages/adapter-base/src/conformance.ts`, `packages/types`.                                                                                                  |
| **Scalability**               | Workers process intents asynchronously with BullMQ + Redis, reconciliation queues, OpenTelemetry tracing.                                                         | `apps/worker/src/run.ts`, `packages/telemetry/src/tracing.ts`.                                                                                                 |
| **Atomic swaps**              | Anchor bonds, cross-rail intents, simulator parity tests for end-to-end execution previews.                                                                       | `packages/keeta/src/anchor-bonds.ts`, `examples/simulation-fidelity/`.                                                                                         |
| **Agentic payments**          | Agent runtime + MCP tools that let an LLM author and execute intents under policy.                                                                                | `packages/agent-runtime/`, `apps/mcp/TOOLS.md`, `packages/adapter-x402/`.                                                                                      |

These themes inform the **copy** and the **section ordering of pillars on each deep-dive page**.
They are not tag-lines and are not repeated verbatim from any external site.

---

## 3. Visual Identity Direction (Original)

The existing `apps/web` palette is already on-brand and we keep it:

- `graphite #080b0f` — page background.
- `panel #10161c` — surface.
- `line #21313a` — borders.
- `keeta #44f1a6` — primary accent.
- `cyanline #5ad7ff` — secondary accent.

Globals already include a top-left/top-right radial-gradient backdrop (`apps/web/app/globals.css`)
using these accent colours. Phase 2 may **extend** this with:

- A new `display` font pairing for hero/headlines (variable font from Google Fonts, self-hosted via
  `next/font`).
- A consistent grid: max-w `7xl`, page padding `px-5`, vertical rhythm `py-16` to `py-24` per
  section. (Already used in `Hero.tsx` and `app/page.tsx`.)
- A motion vocabulary: 200–300ms ease-out for hover, 400–600ms ease for on-scroll fades. No
  carousels, no auto-playing video, no parallax.

We **do not** copy:

- Keeta.com's exact gradient stops, logo lock-up, or diagram styles.
- PayAI's mascot, illustration set, or 3D motifs.

---

## 4. Anti-Copy Checklist (per page review)

Before any new page on `apps/web` ships, the reviewer must answer "yes" to all of these:

- [ ] Every line of body copy was written for this repo, by a contributor, and reads as such (it
      cites or links our files).
- [ ] No image, SVG, gradient, or animation is sourced from payai.network, keeta.com, or any third
      party without explicit licensing.
- [ ] No FAQ question or answer is recognisable as a paraphrase of an external site's FAQ.
- [ ] The page's section sequence may share _type_ with an external site, but **proportions,
      density, motion, and visual rhythm are our own**.
- [ ] Section names use neutral product language (Routing, Policy, Simulator, Connectivity, Ramps,
      Agents, Super Swap) — never an external company's product names.
- [ ] No third-party logos appear in the page unless we have a written partnership and the logo's
      brand guidelines are followed.

If any item fails, the page is rewritten — not patched.
