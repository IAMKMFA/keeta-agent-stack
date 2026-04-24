#!/usr/bin/env tsx
/**
 * Generate `apps/mcp/TOOLS.md` from the live MCP tool registrations.
 *
 * Strategy: pass a fake `server` object into each `register*Tools(server)`
 * function. The fake captures every `server.tool(name, description, inputShape, handler)`
 * call. We then convert each input shape to JSON schema and render markdown.
 *
 * Run: `pnpm --filter @keeta-agent-stack/mcp docs:tools`
 */
import { writeFileSync } from 'node:fs';
import { dirname, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';
import { z, type ZodRawShape } from 'zod';
import { zodToJsonSchema } from 'zod-to-json-schema';

import { registerBootstrapTools } from '../src/tools/bootstrap.js';
import { registerDiscoveryTools } from '../src/tools/discovery.js';
import { registerExecuteTools } from '../src/tools/execute.js';
import { registerOracleTools } from '../src/tools/oracle.js';
import { registerOraclePaymentTools } from '../src/tools/oracle-payment.js';
import { registerAgentPlaybookTools } from '../src/tools/agent-playbook.js';
import { registerAnchorTools } from '../src/tools/anchors.js';
import { registerAnchorChainingTools } from '../src/tools/anchor-chaining.js';
import { registerControlPlaneTools } from '../src/tools/control-plane.js';

interface CapturedTool {
  module: string;
  name: string;
  description: string;
  inputShape: ZodRawShape;
}

const captured: CapturedTool[] = [];

function makeFakeServer(module: string) {
  return {
    tool(name: string, description: string, inputShape: ZodRawShape, _handler: unknown): void {
      captured.push({ module, name, description, inputShape });
    },
    resource(): void {
      // ignored — TOOLS.md is for tools only
    },
  } as unknown as Parameters<typeof registerBootstrapTools>[0];
}

const REGISTRATIONS: Array<{
  module: string;
  register: (s: ReturnType<typeof makeFakeServer>) => void;
}> = [
  { module: 'bootstrap', register: registerBootstrapTools },
  { module: 'discovery', register: registerDiscoveryTools },
  { module: 'execute', register: registerExecuteTools },
  { module: 'oracle', register: registerOracleTools },
  { module: 'oracle-payment', register: registerOraclePaymentTools },
  { module: 'agent-playbook', register: registerAgentPlaybookTools },
  { module: 'anchors', register: registerAnchorTools },
  { module: 'anchor-chaining', register: registerAnchorChainingTools },
  { module: 'control-plane', register: registerControlPlaneTools },
];

for (const { module, register } of REGISTRATIONS) {
  register(makeFakeServer(module));
}

/**
 * Classify a tool as `read`, `write`, or `signing`. Best-effort heuristic based
 * on tool name; the goal is to give an LLM agent a quick gut check, not a
 * security guarantee.
 */
function classify(t: CapturedTool): 'read' | 'write' | 'signing' {
  const SIGNING_NAMES = new Set([
    'keeta_user_client_execute',
    'keeta_builder_execute',
    'keeta_anchor_execute',
  ]);
  if (SIGNING_NAMES.has(t.name)) return 'signing';

  const WRITE_PATTERNS = [
    /^keeta_create_/,
    /^keeta_update_/,
    /^keeta_delete_/,
    /^keeta_set_/,
    /^keeta_clear_/,
    /^keeta_approve_/,
    /^keeta_hold_/,
    /^keeta_release_/,
    /^keeta_quote_/,
    /^keeta_route_/,
    /^keeta_evaluate_/,
    /^keeta_execute_/,
    /^keeta_override_/,
    /^keeta_subscribe_/,
    /^keeta_run_payment_anchor_/,
    /^keeta_reconcile_/,
    /^keeta_wallet_create_or_import$/,
    /^keeta_request_test_tokens$/,
    /^oracle\.payment\.execute$/,
    /^oracle\.replay$/,
    /^activate_subscription$/,
    /^manage_social_alerts$/,
  ];
  if (WRITE_PATTERNS.some((p) => p.test(t.name))) return 'write';
  return 'read';
}

const MODULE_HEADINGS: Record<string, string> = {
  bootstrap: 'Bootstrap (seeds, accounts, faucet, network config)',
  discovery: 'Discovery (introspect Keeta SDK)',
  execute: 'Execute (dynamic Keeta SDK calls; seed-gated)',
  oracle: 'KTA-Oracle (rates, rails, compliance, market data)',
  'oracle-payment': 'Oracle Payment Playbook (preview/execute)',
  'agent-playbook': 'Agent Playbooks (high-level decision support)',
  anchors: 'Payment Anchors (CRUD + lifecycle)',
  'anchor-chaining': 'Anchor Chaining (multi-hop graph queries)',
  'control-plane': 'Control Plane (Keeta Agent Stack API surface)',
};

const CLASS_BADGE: Record<string, string> = {
  read: '`read`',
  write: '`write`',
  signing: '`signing`',
};

function shapeToInlineJson(shape: ZodRawShape): string {
  if (Object.keys(shape).length === 0) return '`{}`';
  const obj = z.object(shape);
  const json = zodToJsonSchema(obj, { target: 'jsonSchema7' }) as {
    properties?: Record<string, unknown>;
    required?: string[];
  };
  const props = json.properties ?? {};
  const required = new Set(json.required ?? []);
  const fields = Object.entries(props).map(([key, val]) => {
    const v = val as { type?: string | string[]; enum?: unknown[]; format?: string };
    let type = Array.isArray(v.type) ? v.type.join('|') : v.type ?? 'unknown';
    if (v.enum) type = `enum(${(v.enum as string[]).map((e) => JSON.stringify(e)).join('|')})`;
    if (v.format) type = `${type} (${v.format})`;
    const flag = required.has(key) ? '!' : '?';
    return `${key}${flag}: ${type}`;
  });
  return '`{ ' + fields.join(', ') + ' }`';
}

const sortedModules = Array.from(new Set(captured.map((t) => t.module)));

const lines: string[] = [];
lines.push('# MCP tools (auto-generated)');
lines.push('');
lines.push('> This file is generated by `apps/mcp/scripts/dump-tools.ts`. Do not edit by hand.');
lines.push('> Run `pnpm --filter @keeta-agent-stack/mcp docs:tools` to regenerate.');
lines.push('');
lines.push(
  `**${captured.length} tools** across ${sortedModules.length} modules. Conventions:`,
);
lines.push('');
lines.push('- `read` — does not change server, chain, or third-party state.');
lines.push('- `write` — mutates control-plane state, queues jobs, or hits external write endpoints.');
lines.push(
  '- `signing` — invokes a signing path. Requires `KEETA_SIGNING_SEED` (worker-side) or `MCP_ALLOW_INLINE_SEEDS=true` (dev only).',
);
lines.push(
  '- Field suffix `!` = required, `?` = optional. Defaults are not shown; consult the source.',
);
lines.push('');
lines.push('## Table of contents');
lines.push('');
for (const mod of sortedModules) {
  lines.push(`- [${MODULE_HEADINGS[mod] ?? mod}](#${mod})`);
}
lines.push('');

for (const mod of sortedModules) {
  const tools = captured.filter((t) => t.module === mod);
  lines.push(`## ${MODULE_HEADINGS[mod] ?? mod}`);
  lines.push('');
  lines.push(`<a id="${mod}"></a>`);
  lines.push('');
  lines.push('| Tool | Class | Input | Description |');
  lines.push('|---|---|---|---|');
  for (const t of tools) {
    const desc = t.description.replace(/\s*\n\s*/g, ' ').replace(/\|/g, '\\|');
    lines.push(
      `| \`${t.name}\` | ${CLASS_BADGE[classify(t)]} | ${shapeToInlineJson(t.inputShape)} | ${desc} |`,
    );
  }
  lines.push('');
}

lines.push('## Source modules');
lines.push('');
for (const mod of sortedModules) {
  lines.push(`- \`apps/mcp/src/tools/${mod}.ts\``);
}
lines.push('');

const outputPath = resolve(dirname(fileURLToPath(import.meta.url)), '../TOOLS.md');
writeFileSync(outputPath, lines.join('\n'));
console.log(`wrote ${captured.length} tools to ${outputPath}`);
