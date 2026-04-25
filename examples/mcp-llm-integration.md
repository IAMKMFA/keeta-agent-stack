# MCP + LLM integration

The Keeta Agent Stack ships a stdio MCP server (`apps/mcp`) that exposes every control-plane action
— wallet provisioning, intents, routing, policy, anchors, oracle pricing, and the new Oracle Payment
Playbook — as typed MCP tools.

This doc is the practical wiring guide for three of the most common LLM hosts: **Grok (OpenAI
function calling)**, **Anthropic Claude**, and **LangGraph**. Every recipe targets the same set of
tools so you can pick the runtime that fits your team without rewriting prompts.

> All tools return the standard envelope: `{ ok: true, data: ... }` or
> `{ ok: false, error: { code, message, retryable, hint? } }`. Build one response handler in your
> agent loop and reuse it everywhere.

## Prerequisites

```bash
# from the monorepo root
pnpm install
docker compose up -d
pnpm dev:all
```

Set the env vars the MCP server reads:

| Variable                             | Required        | Purpose                                                                           |
| ------------------------------------ | --------------- | --------------------------------------------------------------------------------- |
| `API_URL` (or `KEETA_AGENT_API_URL`) | yes             | Where the MCP server sends control-plane calls. Default: `http://localhost:3001`. |
| `OPS_API_KEY`                        | for write tools | Service credential. Required for `oracle.replay`, wallet `import`, etc.           |
| `KTA_ORACLE_BASE_URL`                | optional        | Override the default Oracle endpoint.                                             |
| `KTA_ORACLE_TIMEOUT_MS`              | optional        | Bound Oracle request latency. Default: 10_000.                                    |

Launch the MCP server (it speaks stdio):

```bash
pnpm dev:mcp
```

## Tool catalog (most relevant)

| Tool                                                                                           | Purpose                                                                         |
| ---------------------------------------------------------------------------------------------- | ------------------------------------------------------------------------------- |
| `keeta_create_intent`                                                                          | Persist a new `ExecutionIntent`.                                                |
| `keeta_quote_intent` / `keeta_route_intent` / `keeta_evaluate_policy` / `keeta_execute_intent` | Walk an intent through the pipeline stages.                                     |
| `keeta_stream_events`                                                                          | Capture SSE events for a bounded window — useful for "wait for terminal state". |
| `oracle.payment.preview`                                                                       | Rates + rails + execution instructions for a fiat → KTA payment.                |
| `oracle.payment.execute`                                                                       | Idempotent execution of a previewed payment (CSRF-style confirmation required). |
| `oracle.subscription.list`                                                                     | List the agent's recurring subscriptions.                                       |
| `oracle.replay`                                                                                | Operator-only replay of a previous run (requires `OPS_API_KEY`).                |
| `keeta_oracle_compare_rails`                                                                   | Compare Keeta vs SWIFT/bankwire/Stripe/Visa pricing.                            |

Run `keeta_oracle_list_mirrored_tools` to enumerate every mirrored upstream Oracle tool the server
is shipping at runtime.

---

## 1. Grok (OpenAI function calling)

Grok speaks the OpenAI Chat Completions / Tool-Use schema. The shape of every MCP tool is
`{ name, description, inputSchema }` — convert each MCP tool into a function declaration and
dispatch.

```ts
import OpenAI from 'openai';
import { spawn } from 'node:child_process';
import { JSONRPCResponseSchema } from '@modelcontextprotocol/sdk/types.js';

const grok = new OpenAI({
  baseURL: 'https://api.x.ai/v1',
  apiKey: process.env.XAI_API_KEY!,
});

// 1. Boot the MCP server over stdio.
const mcp = spawn('pnpm', ['--filter', '@keeta-agent-stack/mcp', 'start'], {
  stdio: ['pipe', 'pipe', 'inherit'],
  env: process.env,
});

// 2. Discover tools (tools/list JSON-RPC) — see the MCP SDK README for the
//    one-line `Client` wrapper that does this for you.
const tools = await listMcpTools(mcp);

// 3. Map MCP tool definitions to OpenAI function declarations.
const functions = tools.map((tool) => ({
  type: 'function' as const,
  function: {
    name: tool.name.replaceAll('.', '_'), // OpenAI rejects dots
    description: tool.description,
    parameters: tool.inputSchema, // already JSON Schema
  },
}));

// 4. Drive the agent loop.
let messages = [
  { role: 'system', content: 'You are a Keeta payment agent.' },
  { role: 'user', content: 'Send 100 USD to keeta_abc... using the cheapest rail.' },
];
while (true) {
  const res = await grok.chat.completions.create({
    model: 'grok-4',
    messages,
    tools: functions,
    tool_choice: 'auto',
  });
  const msg = res.choices[0].message;
  messages.push(msg);
  if (!msg.tool_calls?.length) break;
  for (const call of msg.tool_calls) {
    const original = call.function.name.replaceAll('_', '.');
    const result = await callMcpTool(mcp, original, JSON.parse(call.function.arguments));
    messages.push({
      role: 'tool',
      tool_call_id: call.id,
      content: JSON.stringify(result),
    });
  }
}
```

The MCP envelope (`{ ok, data | error }`) is opaque to Grok, but the model will read `error.code` /
`error.hint` and self-correct. We rely on this in the Oracle Payment Playbook walkthrough below.

## 2. Anthropic Claude

Claude's native tool-use protocol is a near-perfect mirror of MCP, so you can forward MCP tool
definitions almost verbatim.

```ts
import Anthropic from '@anthropic-ai/sdk';

const claude = new Anthropic({ apiKey: process.env.ANTHROPIC_API_KEY! });

const claudeTools = tools.map((tool) => ({
  name: tool.name.replaceAll('.', '_'),
  description: tool.description,
  input_schema: tool.inputSchema,
}));

const res = await claude.messages.create({
  model: 'claude-4.6-sonnet',
  max_tokens: 4096,
  tools: claudeTools,
  messages: [
    {
      role: 'user',
      content:
        'I want to send 100 USD to keeta_abc on testnet. Preview first, then ask me to confirm before executing.',
    },
  ],
});

// Iterate `res.content` looking for `tool_use` blocks → dispatch via the same
// MCP client → push `tool_result` blocks back into the conversation.
```

The `oracle.payment.execute` tool requires the literal string `"CONFIRM"` in the `confirmation`
field. Claude reliably gates this on a follow-up user turn — the MCP server will return
`INVALID_ARGUMENTS` otherwise, which Claude surfaces back to the user.

## 3. LangGraph

LangGraph treats MCP tools as ordinary `BaseTool` instances. Use the `langchain-mcp` adapter (or
hand-roll one in ~20 lines) to bridge the stdio MCP server into a `ToolNode`.

```ts
import { StateGraph, START, END } from '@langchain/langgraph';
import { ChatAnthropic } from '@langchain/anthropic';
import { McpToolkit } from 'langchain-mcp';

const toolkit = await McpToolkit.fromCommand({
  command: 'pnpm',
  args: ['--filter', '@keeta-agent-stack/mcp', 'start'],
});

const llm = new ChatAnthropic({ model: 'claude-4.6-sonnet' });
const llmWithTools = llm.bindTools(toolkit.tools);

const graph = new StateGraph({
  channels: { messages: { value: (a, b) => a.concat(b), default: () => [] } },
})
  .addNode('llm', async (state) => ({ messages: [await llmWithTools.invoke(state.messages)] }))
  .addNode('tools', toolkit.toolNode)
  .addEdge(START, 'llm')
  .addConditionalEdges('llm', (state) => {
    const last = state.messages.at(-1);
    return last?.tool_calls?.length ? 'tools' : END;
  })
  .addEdge('tools', 'llm')
  .compile();

const out = await graph.invoke({
  messages: [{ role: 'user', content: 'Schedule a recurring 50 USD weekly payment to keeta_abc.' }],
});
```

LangGraph's checkpoint store + retry semantics pair nicely with the `oracle.payment.execute`
idempotency model — same `correlationId` will return the cached envelope on retry, so the graph
won't double-execute on a node failure.

---

## Oracle Payment Playbook walkthrough (end-to-end)

This is the canonical multi-turn flow the new tools were designed for. Use it as the system prompt
for any of the three runtimes above.

```text
You are a Keeta payment agent. ALWAYS:

  1. Call oracle.payment.preview first to gather rates + rails.
  2. Show the user the proposed quote, recipient, and total cost.
  3. Wait for the user to type CONFIRM literally.
  4. Call oracle.payment.execute with confirmation: "CONFIRM" and a stable
     correlationId derived from the session id + intent id.
  5. If oracle.payment.execute returns ok=false with code NOT_IMPLEMENTED,
     surface error.hint to the user and stop — do not retry.
  6. After execution, call keeta_stream_events with intentId for up to 30s
     to capture terminal state.
  7. Use oracle.subscription.list to verify any recurring schedules.
  8. NEVER call oracle.replay unless the user provides explicit operator
     authorisation.
```

### Sample agent transcript

```text
User: "Send 250 EUR to keeta_xyz... and let me know which rail wins."

LLM → tool: oracle.payment.preview { amount: 250, currency: "EUR",
                                     recipientWallet: "keeta_xyz...",
                                     compareFrom: "all" }

Tool → LLM: { ok: true, data: { preview: { rate: ..., rails: [...],
                                           bestRail: "keeta_native",
                                           sdkSnippet: "..." } } }

LLM → User: "Best rail: keeta_native (fee 12 bps vs SWIFT 92 bps).
             Settlement < 5s. Reply CONFIRM to execute."

User: "CONFIRM"

LLM → tool: oracle.payment.execute { intentId, correlationId,
                                     confirmation: "CONFIRM" }

Tool → LLM: { ok: false, error: { code: "NOT_IMPLEMENTED",
                                  message: "Backend execution endpoint
                                            not yet implemented",
                                  retryable: false,
                                  hint: "..." } }

LLM → User: "Backend execution endpoint isn't wired yet — guardrails
             enforced. Once /intents/:id/execute is live this will move
             funds. Want me to fall back to keeta_create_intent +
             keeta_execute_intent for the legacy path?"
```

When the backend stub is replaced, the same agent prompt continues to work — the only change is that
`oracle.payment.execute` returns `{ ok: true, data: { txId, status: 'submitted' } }`.

## See also

- [`apps/mcp/src/tools/`](../apps/mcp/src/tools) — every registered tool with full Zod schema.
- [Root README → Common Agent Patterns](../README.md#common-agent-patterns--examples) for the linked
  example projects.
- [`docs/dashboard-v2-contract.md`](../docs/dashboard-v2-contract.md) §A3 for the dashboard-side
  mutation guardrails this MCP integration mirrors.
