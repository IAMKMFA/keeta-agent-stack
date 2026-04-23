# Security Policy

The Keeta Agent SDK ships infrastructure that touches signing keys, live
payments, and operator controls. We take security reports seriously and ask
that you give us a chance to fix issues before they are made public.

## Supported Versions

The Keeta Agent SDK is in active 0.x pre-release. Security fixes land on
`main`. Tagged releases will be supported on a rolling-latest basis once
1.0 ships.

| Version | Supported          |
| ------- | ------------------ |
| `main`  | yes                |
| `0.x`   | best-effort        |
| `< 0.x` | no                 |

## Reporting a Vulnerability

Please **do not** open a public GitHub issue for security reports.

Instead, use one of these private channels:

1. **GitHub Security Advisories** — preferred. Go to the repository's
   [Security tab](https://github.com/IAMKMFA/keeta-agent-sdk/security/advisories/new)
   and click *Report a vulnerability*. This creates a private advisory only
   the maintainers can read.
2. **Direct contact** — if you don't have a GitHub account, open an empty
   issue titled `Security contact request` and a maintainer will reach out
   privately to set up a secure channel.

When you report, please include:

- a description of the issue and its impact
- the affected commit hash, branch, or release tag
- a minimal reproduction (PoC code, payload, or steps)
- whether the issue affects mock-only paths or live execution
- any logs, stack traces, or screenshots

We aim to respond within **3 business days** with an acknowledgement and an
initial triage. Critical issues affecting live signing or policy bypass are
prioritised over functional bugs.

## Scope

In scope:

- the API (`apps/api`), worker (`apps/worker`), dashboard (`apps/dashboard`),
  and MCP server (`apps/mcp`)
- every package under `packages/`
- the published `@keeta-agent-sdk/*` npm packages once they are released
- the starter template (`starter-agent-template/`)
- documentation that recommends insecure defaults

Out of scope:

- third-party services we integrate with (Keeta network, partner anchors,
  oracle providers) — please report those to their respective vendors
- vulnerabilities in dependencies that are already publicly disclosed and
  awaiting a release; we still want to know, but they're tracked separately
- denial-of-service via traffic alone against an unauthenticated public
  endpoint with no authentication bypass

## Coordinated Disclosure

We follow standard coordinated disclosure:

1. You report the issue privately.
2. We confirm reproduction and start a fix.
3. We agree on a disclosure timeline (default: 90 days from report).
4. We ship a patch and publish a security advisory crediting you (unless
   you prefer to remain anonymous).

We do not currently run a paid bug-bounty program, but we will publicly
credit reporters in the advisory and CHANGELOG.

## Hardening Checklist for Operators

If you run this stack in production, also read:

- [docs/deployment.md](./docs/deployment.md) — production env hardening,
  network isolation, secret rotation, observability
- [.env.example](./.env.example) — every security-relevant env var with
  inline guidance
- [apps/dashboard/README.md](./apps/dashboard/README.md) — dashboard auth
  model and the three layers of access control

Thanks for helping keep the Keeta ecosystem safe.
