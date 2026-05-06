export interface CodeSnippet {
  readonly id: string;
  readonly title: string;
  readonly language: 'bash' | 'ts' | 'json';
  readonly code: string;
  readonly caption?: string;
}

/**
 * Canonical local-dev sequence. Every command corresponds to a real
 * script in the root `package.json`:
 *  - `pnpm install`         → workspace install
 *  - `docker compose up -d` → Postgres + Redis (see docker-compose.yml)
 *  - `pnpm db:migrate`      → packages/storage migrations
 *  - `pnpm dev:all`         → API + worker + dashboard + MCP via Turbo
 *  - `pnpm demo`            → scripts/demo.sh (deterministic preview)
 */
export const quickstartCommandsSnippet: CodeSnippet = {
  id: 'quickstart-commands',
  title: 'Local development',
  language: 'bash',
  code: [
    'git clone https://github.com/IAMKMFA/keeta-agent-stack.git',
    'cd keeta-agent-stack',
    'pnpm install',
    'docker compose up -d        # Postgres + Redis',
    'pnpm db:migrate              # packages/storage migrations',
    'pnpm dev:all                 # api + worker + dashboard + mcp',
    'pnpm demo                    # deterministic end-to-end preview',
  ].join('\n'),
  caption: 'Brings up the API, worker, dashboard, and MCP in mock mode.',
};

/**
 * SDK example. References the real public API surface in
 * `packages/sdk/src/client.ts`:
 *   `createClient` → factory.
 *   `client.createIntent(body)` → POST `/intents`.
 *   `body` is `CreateIntentRequest` from the same module.
 */
export const intentSnippet: CodeSnippet = {
  id: 'intent',
  title: 'Author an intent with the SDK',
  language: 'ts',
  code: [
    "import { createClient, type CreateIntentRequest } from '@keeta-agent-stack/sdk';",
    '',
    'const client = createClient({ baseUrl: process.env.KEETA_AGENT_API_URL });',
    '',
    'const body: CreateIntentRequest = {',
    "  agentId: 'rebalancer-1',",
    "  source: { amount: '5000', asset: 'USDC', chain: 'base' },",
    "  destination: { amount: '5000', asset: 'USDC', chain: 'keeta-test' },",
    "  policyPackId: 'treasury-tier-1',",
    '};',
    '',
    'const intent = await client.createIntent(body);',
    'console.log(intent.id, intent.createdAt);',
  ].join('\n'),
  caption: 'Verified against `packages/sdk/src/client.ts` (`createClient`, `createIntent`).',
};

/**
 * Agent-runtime example. References the real public surface in
 * `packages/agent-runtime/src/factory.ts`:
 *   `createKeetaAgent` → factory.
 *   The returned `agent.execute(body)` runs the canonical pipeline.
 *   Hook names mirror `KeetaAgentHooks`.
 */
export const agentRuntimeSnippet: CodeSnippet = {
  id: 'agent-runtime',
  title: 'Compose a long-running agent',
  language: 'ts',
  code: [
    "import { createKeetaAgent, type CreateKeetaAgentOptions } from '@keeta-agent-stack/agent-runtime';",
    "import { createClient } from '@keeta-agent-stack/sdk';",
    '',
    'const sdk = createClient({ baseUrl: process.env.KEETA_AGENT_API_URL });',
    '',
    "const opts: CreateKeetaAgentOptions = { name: 'rebalancer-1', sdk };",
    'const agent = createKeetaAgent({',
    '  ...opts,',
    '  hooks: {',
    '    onIntent:  (ctx) => console.log(\'intent\',  ctx.intent.id),',
    '    afterRoute: (ctx) => console.log(\'route\',   ctx.metadata.routePlanId),',
    '    afterPolicy: (ctx) => console.log(\'policy\', ctx.metadata.policyDecision),',
    '    afterExecution: (ctx) => console.log(\'done\', ctx.metadata.terminalEvent),',
    '  },',
    '});',
    '',
    'await agent.execute({',
    "  agentId: 'rebalancer-1',",
    "  source:      { amount: '5000', asset: 'USDC', chain: 'base' },",
    "  destination: { amount: '5000', asset: 'USDC', chain: 'keeta-test' },",
    "  policyPackId: 'treasury-tier-1',",
    '});',
  ].join('\n'),
  caption: 'Verified against `packages/agent-runtime/src/factory.ts` (`createKeetaAgent`).',
};

/**
 * Curl preview of the API control plane. The Fastify spec lives at
 * `GET /openapi.json`; Swagger UI is mounted at `/docs` while the
 * service is running locally.
 */
export const apiOverviewSnippet: CodeSnippet = {
  id: 'api-overview',
  title: 'Hit the API control plane',
  language: 'bash',
  code: [
    '# Local API base URL (set by `pnpm dev:all`)',
    'export API=http://localhost:3001',
    '',
    '# 1. Inspect the live OpenAPI spec',
    'curl -s "$API/openapi.json" | jq \'.info\'',
    '',
    '# 2. Read the registered adapters',
    'curl -s -H "x-ops-api-key: $OPS_API_KEY" "$API/adapters" | jq \'.[].id\'',
    '',
    '# 3. Submit an intent (operator role required)',
    'curl -s -X POST "$API/intents" \\',
    '  -H "content-type: application/json" \\',
    '  -H "x-ops-api-key: $OPS_API_KEY" \\',
    '  -d \'{"agentId":"hello","source":{"amount":"1","asset":"USDC","chain":"base"},"destination":{"amount":"1","asset":"USDC","chain":"keeta-test"}}\' \\',
    '  | jq \'.id, .createdAt\'',
  ].join('\n'),
  caption:
    'Live spec at `/openapi.json`; Swagger UI at `/docs`. Operator key never enters the browser.',
};

/**
 * MCP `mcpServers` host config. Mirrors the README in `apps/mcp` and
 * the `MCP_ALLOW_INLINE_SEEDS` posture documented in `SECURITY.md`.
 */
export const mcpSnippet: CodeSnippet = {
  id: 'mcp',
  title: 'Expose the stack to an LLM agent',
  language: 'json',
  code: [
    '{',
    '  "mcpServers": {',
    '    "keeta-agent-stack": {',
    '      "command": "pnpm",',
    '      "args": ["--filter", "@keeta-agent-stack/mcp", "start"],',
    '      "env": {',
    '        "KEETA_AGENT_API_URL": "http://localhost:3001",',
    '        "MCP_ALLOW_INLINE_SEEDS": "false"',
    '      }',
    '    }',
    '  }',
    '}',
  ].join('\n'),
  caption: 'Inline `seed` arguments are rejected by default. See SECURITY.md.',
};

/**
 * Backwards-compatible alias for the previous "install / quickstart"
 * snippet. New code should import `quickstartCommandsSnippet`.
 */
export const installSnippet: CodeSnippet = quickstartCommandsSnippet;

export const homeQuickstartSnippets: ReadonlyArray<CodeSnippet> = [
  quickstartCommandsSnippet,
  intentSnippet,
  mcpSnippet,
];
