# Project Review & Scoring Template

> Drop this prompt into any codebase conversation to get a structured, repeatable review with
> grading, gap analysis, and prioritized upgrade recommendations. Works with any language,
> framework, or architecture.

---

## THE PROMPT

Copy everything below the line into your conversation with the AI assistant after it has access to
your codebase.

---

```
I need you to perform a comprehensive project review and score this codebase. Follow this exact methodology — do not skip phases or collapse them.

## Phase 1: Deep Exploration (do this FIRST, before scoring)

Launch parallel research across these 4 areas. Read actual file contents, not just file names. For each area, identify what's IMPLEMENTED vs STUBBED vs MISSING.

### Area 1: Developer API Surface
- Main SDK entrypoint / public API — what can a consumer actually do?
- Type system — schemas, validation, type safety patterns
- Extension points — can developers plug in custom logic?
- Error handling patterns — structured errors, retry semantics, error classification
- Configuration — how is the system configured? env vars, config files, feature flags?

### Area 2: Core Architecture & Pipeline
- Data flow — trace the primary workflow end-to-end (e.g., request → processing → result)
- State management — how is state persisted, transitioned, validated?
- Async/job processing — queues, workers, scheduling, retry logic
- Database schema — tables, indices, migrations, relationships
- Caching strategy — what's cached, TTLs, invalidation

### Area 3: Infrastructure & Operations
- API design — RESTful? GraphQL? RPC? Validation, auth, error responses
- Observability — logging, metrics, tracing, alerting
- Real-time capabilities — webhooks, SSE, WebSocket, push notifications
- Testing — unit, integration, e2e, contract tests, coverage
- CI/CD — build pipeline, deployment, environment management
- Documentation — API docs, architecture docs, getting-started guides
- Dev experience — onboarding, local setup, example code

### Area 4: Domain-Specific Integration
- How deeply does this project integrate with its target domain/platform?
- Is it genuinely native to its ecosystem, or a generic framework with branding?
- What domain-specific features are real vs stubbed?
- What domain primitives are missing?

## Phase 2: Score (only after Phase 1 is complete)

Score each dimension on a 0–10 scale. Use this rubric:

| Score | Meaning |
|-------|---------|
| 9–10 | Production-excellent. Would pass a senior eng review at a top company. Near-zero gaps. |
| 7–8 | Solid and functional. Some gaps but core is reliable. Ready for production with caveats. |
| 5–6 | Partially built. Core works but significant gaps in extensibility, testing, or hardening. |
| 3–4 | Scaffolded. Structure exists but major functionality is missing or stubbed. |
| 1–2 | Placeholder. Barely functional. |

### Scoring Dimensions (adapt names to your domain but keep all 12)

1. **Domain Integration** — How deeply does this integrate with its target platform/ecosystem? Real implementations vs wrappers/stubs.
2. **Type Safety & Schemas** — Type coverage, validation, schema enforcement, discriminated unions, nullability handling.
3. **Core Pipeline** — The primary workflow. Is it complete, audited, resilient? Can it recover from failures?
4. **Extensibility & Plugin Architecture** — Can developers extend core behavior (custom rules, plugins, middleware, hooks)?
5. **Data Layer** — Schema design, query patterns, migrations, indexing, scaling strategy.
6. **API Design** — RESTful/GraphQL quality, validation, auth, error responses, versioning.
7. **Observability** — Logging, metrics, tracing, alerting. Can you debug production issues?
8. **Real-Time & Events** — Push-based updates (webhooks, SSE, WebSocket). Event-driven architecture.
9. **Testing** — Unit, integration, e2e, contract tests. Coverage of happy paths AND failure modes.
10. **Documentation** — API docs, architecture docs, getting-started guides, inline documentation.
11. **Developer Experience** — Onboarding, local setup, examples, SDK ergonomics, error messages.
12. **Production Hardening** — Security, retry logic, rate limiting, backpressure, graceful degradation, secret management.

### Output Format

Present the scorecard as a table:

| Dimension | Score | Summary (one line) |
|-----------|-------|-------------------|

Then compute the **overall grade**:
- Calculate the mean of all 12 scores
- Map to letter grade: 9.0+ = A+, 8.5–8.9 = A, 8.0–8.4 = A-, 7.5–7.9 = B+, 7.0–7.4 = B, 6.5–6.9 = B-, 6.0–6.4 = C+, below 6.0 = C or lower
- State the grade and numeric score prominently

## Phase 3: Gap Analysis

For each dimension scoring below 8.0, explain:
1. **What's there** — acknowledge what works
2. **What's missing** — specific gaps, not vague complaints
3. **Why it matters** — impact on users, developers, or operations
4. **What "8.0" looks like** — concrete description of the target state

## Phase 4: Prioritized Upgrade Recommendations

Group recommendations into 3 tiers:

### Tier 1 — Must-Have (blocks the project's stated intent)
For each:
- What to build (2–3 sentences)
- Key files to create or modify
- Expected score impact (which dimensions move, by how much)

### Tier 2 — Should-Have (required for production deployment)
Same format as Tier 1.

### Tier 3 — Nice-to-Have (differentiation and developer experience)
Same format as Tier 1.

### Quick Wins (< 1 day effort, meaningful signal)
Table format: | Win | Effort | Impact |

## Phase 5: Rescore Protocol

When I come back after making changes and ask you to rescore:

1. Explore ONLY what changed (diff-based, not full re-exploration)
2. Present an updated scorecard as a comparison table:
   | Dimension | Before | Now | Delta | What Changed |
3. Explain what moved the score (be specific — name files, functions, patterns)
4. Explain what DIDN'T move and why
5. Update the remaining recommendations (remove completed ones, adjust priorities)
6. Track the score trajectory across reviews:
   | Review | Grade | Score | Key Move |

## Rules

- Do NOT inflate scores to be encouraging. A 5 means "partially built." Call it what it is.
- Do NOT give vague recommendations like "improve testing." Say exactly what tests are missing and where.
- DO acknowledge genuinely good work. If something is well-built, say so and say why.
- DO name specific files, functions, and line numbers when discussing gaps or strengths.
- DO distinguish between "not implemented" and "implemented but not well" — they require different responses.
- When rescoring, do NOT re-read the entire codebase. Focus on what changed and verify claims.
- Score each dimension INDEPENDENTLY. A perfect type system doesn't compensate for zero tests.
```

---

## HOW TO USE THIS TEMPLATE

### First Review

1. Open a conversation with your AI assistant that has access to your codebase
2. Paste the prompt above
3. Let it run the full 4-phase review
4. You'll get: scorecard, gap analysis, prioritized recommendations

### After Making Changes

1. In the same conversation (or a new one with codebase access), say: "Please rescore after the
   latest updates. Here's what changed: [brief summary]"
2. The rescore protocol (Phase 5) kicks in automatically
3. You get a delta comparison, not a full re-review

### Across Multiple Projects

1. Drop the same prompt into each project's conversation
2. Compare scorecards across projects to identify systemic patterns
3. The 12 dimensions are stable across codebases — you can track portfolio health

### Customizing for Your Domain

- Rename "Domain Integration" to match your platform (e.g., "Stripe Integration", "AWS Native",
  "Keeta Chain Depth")
- Add domain-specific sub-criteria under any dimension
- Keep all 12 dimensions — removing one creates blind spots

### Tips for Best Results

- **Give context first**: Before pasting the prompt, tell the assistant what the project IS and what
  it's SUPPOSED to do. "This is an agent SDK for the Keeta network" gives better results than just
  the prompt alone.
- **Share your intent**: "I want this to be production-ready for external developers" vs "This is an
  internal tool" changes what matters.
- **Be honest about stubs**: If you know something is placeholder, say so. It saves exploration time
  and gets you better recommendations.
- **Rescore often**: The trajectory table is the most valuable output over time. It shows velocity
  and direction.
