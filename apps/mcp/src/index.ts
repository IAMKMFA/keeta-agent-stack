#!/usr/bin/env node

import { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { StdioServerTransport } from '@modelcontextprotocol/sdk/server/stdio.js';
import { registerBootstrapTools } from './tools/bootstrap.js';
import { registerDiscoveryTools } from './tools/discovery.js';
import { registerExecuteTools } from './tools/execute.js';
import { registerOracleTools } from './tools/oracle.js';
import { registerAgentPlaybookTools } from './tools/agent-playbook.js';
import { registerAnchorTools } from './tools/anchors.js';

const KEETA_DOCS_MCP = 'https://docs.keeta.com/~gitbook/mcp';
const ORACLE_BASE_URL = process.env.KTA_ORACLE_BASE_URL ?? 'https://kta-oracle.vercel.app';

const server = new McpServer({
  name: 'keeta-agent-sdk-mcp',
  version: '0.0.1',
  description: `Keeta Agent SDK MCP server with dynamic Keeta SDK execution and integrated KTA-Oracle intelligence.

For protocol reference, pair this server with the Keeta docs MCP at ${KEETA_DOCS_MCP}.`,
});

registerBootstrapTools(server);
registerDiscoveryTools(server);
registerExecuteTools(server);
registerOracleTools(server);
registerAgentPlaybookTools(server);
registerAnchorTools(server);

server.resource(
  'keeta-docs-mcp',
  'keeta://docs/mcp-config',
  {
    description: 'Connection details for the official Keeta documentation MCP endpoint.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          {
            keetaDocsMCP: {
              url: KEETA_DOCS_MCP,
              transport: 'streamable-http',
              setup: {
                claudeCode: `claude mcp add --transport http keeta-docs ${KEETA_DOCS_MCP}`,
              },
            },
          },
          null,
          2
        ),
      },
    ],
  })
);

server.resource(
  'kta-oracle-config',
  'keeta://oracle/config',
  {
    description: 'KTA-Oracle endpoint and integration hint used by oracle tools.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          {
            baseUrl: ORACLE_BASE_URL,
            endpoints: ['/status', '/tools', '/rate', '/compare', '/mcp'],
          },
          null,
          2
        ),
      },
    ],
  })
);

server.resource(
  'keeta-agent-playbooks',
  'keeta://agent/playbooks',
  {
    description: 'Built-in high-level playbooks for autonomous agents.',
    mimeType: 'application/json',
  },
  async (uri) => ({
    contents: [
      {
        uri: uri.href,
        text: JSON.stringify(
          {
            playbooks: [
              {
                tool: 'keeta_agent_payment_playbook',
                purpose: 'Plan an end-to-end payment using rates, rails, execution instructions, compliance, and SDK snippet.',
              },
              {
                tool: 'keeta_anchor_commercial_model',
                purpose: 'Describe the three-pillar anchor model: setup fee, KTA bond, and volume fee.',
              },
              {
                tool: 'keeta_run_payment_anchor_onboarding',
                purpose: 'Advance draft anchors through commercial, bond, and activation stages.',
              },
            ],
            recommendedFlow: [
              '1. Use keeta_agent_payment_playbook for decision support',
              '2. Use keeta_anchor_commercial_model when designing a new payment anchor',
              '3. Use keeta_run_payment_anchor_onboarding to progress anchor lifecycle',
              '4. Use keeta_user_client_execute or keeta_builder_execute for network execution',
              '5. Use mirrored Oracle tools for compliance/market follow-ups',
            ],
          },
          null,
          2
        ),
      },
    ],
  })
);

async function main() {
  const transport = new StdioServerTransport();
  await server.connect(transport);
  console.error('Keeta Agent SDK MCP server running on stdio');
}

main().catch((error) => {
  console.error('Fatal error starting MCP server:', error);
  process.exit(1);
});
