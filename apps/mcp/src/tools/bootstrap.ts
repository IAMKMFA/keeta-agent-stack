import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import {
  accountFromSeed,
  createUserClient,
  destroyIfPossible,
  generateSeed,
  getPublicKeyString,
  getUserClientTools,
  KeetaNet,
  validateNetwork,
} from './helpers.js';

const DEFAULT_API_URL = 'http://localhost:3001';

function getApiUrl(): string {
  return (process.env.API_URL ?? process.env.KEETA_AGENT_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

function canRegisterWalletsWithApi(): boolean {
  return typeof process.env.OPS_API_KEY === 'string' && process.env.OPS_API_KEY.length > 0;
}

async function requestApiJson(path: string, init: RequestInit): Promise<unknown> {
  const headers = new Headers(init.headers);
  headers.set('Accept', 'application/json');
  if (init.body && !headers.has('Content-Type')) {
    headers.set('Content-Type', 'application/json');
  }
  if (process.env.OPS_API_KEY) {
    headers.set('x-ops-key', process.env.OPS_API_KEY);
  }

  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  const parsed = text.length > 0 ? (JSON.parse(text) as unknown) : null;
  if (!response.ok) {
    const message =
      typeof parsed === 'object' &&
      parsed !== null &&
      'error' in parsed &&
      typeof parsed.error === 'object' &&
      parsed.error !== null &&
      'message' in parsed.error &&
      typeof parsed.error.message === 'string'
        ? parsed.error.message
        : `HTTP ${response.status}`;
    throw new Error(message);
  }
  return parsed;
}

export function registerBootstrapTools(server: McpServer): void {
  server.tool(
    'keeta_generate_seed',
    'Generate a new random cryptographic seed for Keeta account derivation.',
    {},
    async () => ({
      content: [{ type: 'text', text: JSON.stringify({ seed: generateSeed() }, null, 2) }],
    })
  );

  server.tool(
    'keeta_derive_account',
    'Derive a deterministic Keeta account from seed, index, and optional key algorithm.',
    {
      seed: z.string().describe('Seed string from keeta_generate_seed'),
      index: z.number().int().min(0).describe('Derivation index'),
      algorithm: z.enum(['SECP256K1', 'SECP256R1', 'ED25519']).optional(),
    },
    async ({ seed, index, algorithm }) => {
      const account = accountFromSeed(seed, index, algorithm);
      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                address: account.publicKeyString.get(),
                algorithm: algorithm ?? 'SECP256K1',
                index,
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );

  server.tool(
    'keeta_request_test_tokens',
    'Request free testnet KTA from faucet for a keeta_ address.',
    {
      address: z.string().describe('Keeta address to fund'),
    },
    async ({ address }) => {
      try {
        const params = new URLSearchParams();
        params.append('address', address);
        params.append('amount', '5');
        const response = await fetch('https://faucet.test.keeta.com', {
          method: 'POST',
          headers: { 'Content-Type': 'application/x-www-form-urlencoded' },
          body: params.toString(),
        });

        if (!response.ok) {
          return {
            content: [{ type: 'text', text: JSON.stringify({ error: `Faucet returned ${response.status}`, address }) }],
          };
        }

        await new Promise((resolve) => setTimeout(resolve, 2000));

        const client = createUserClient(validateNetwork('test'), null);
        try {
          const userClientTools = getUserClientTools(client);
          const balance = await userClientTools.client.getBalance(address, userClientTools.baseToken);
          return {
            content: [
              {
                type: 'text',
                text: JSON.stringify(
                  {
                    status: 'success',
                    address,
                    amountRequested: '5 KTA',
                    currentBalance: String(balance),
                  },
                  null,
                  2
                ),
              },
            ],
          };
        } finally {
          await destroyIfPossible(client);
        }
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({
                error: `Faucet request failed: ${error instanceof Error ? error.message : String(error)}`,
                address,
              }),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'keeta_get_network_config',
    'Return network id, base token and network account for main/test.',
    {
      network: z.enum(['main', 'test']),
    },
    async ({ network }) => {
      const net = validateNetwork(network);
      const config = KeetaNet.Client.Config.getDefaultConfig(net);
      const client = createUserClient(net, null);
      try {
        const userClientTools = getUserClientTools(client);
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  networkAlias: network,
                  networkId: config.network,
                  baseToken: getPublicKeyString(userClientTools.baseToken),
                  networkAddress: getPublicKeyString(userClientTools.networkAddress),
                },
                null,
                2
              ),
            },
          ],
        };
      } finally {
        await destroyIfPossible(client);
      }
    }
  );

  server.tool(
    'keeta_wallet_create_or_import',
    `Create a new wallet (generate seed + derive address) or import an existing address.
If API credentials are configured (OPS_API_KEY + API_URL/KEETA_AGENT_API_URL), registration uses /wallets/import.
Seeds are never persisted by the API in this flow.`,
    {
      mode: z.enum(['create', 'import']),
      label: z.string().optional().describe('Required for register=true or import mode'),
      address: z.string().optional().describe('Required for import mode'),
      index: z.number().int().min(0).default(0).describe('Derivation index for create mode'),
      algorithm: z.enum(['SECP256K1', 'SECP256R1', 'ED25519']).optional().describe('Key algorithm for create mode'),
      register: z.boolean().default(true).describe('Whether to register address in API wallets table'),
      include_seed: z.boolean().default(true).describe('Include the generated seed in create-mode output'),
    },
    async ({ mode, label, address, index, algorithm, register, include_seed }) => {
      try {
        const apiConfigured = canRegisterWalletsWithApi();
        if (mode === 'import') {
          if (!label || !address) {
            throw new Error('Both "label" and "address" are required for import mode.');
          }
          if (!apiConfigured) {
            throw new Error('Import requires OPS_API_KEY plus API_URL (or KEETA_AGENT_API_URL) to call /wallets/import.');
          }
          const wallet = await requestApiJson('/wallets/import', {
            method: 'POST',
            body: JSON.stringify({ label, address }),
          });
          return {
            content: [{ type: 'text', text: JSON.stringify({ mode, registered: true, wallet }, null, 2) }],
          };
        }

        const seed = generateSeed();
        const account = accountFromSeed(seed, index, algorithm);
        const derivedAddress = account.publicKeyString.get();
        let wallet: unknown;
        let registered = false;

        if (register) {
          if (!label) {
            throw new Error('"label" is required when register=true.');
          }
          if (apiConfigured) {
            wallet = await requestApiJson('/wallets/import', {
              method: 'POST',
              body: JSON.stringify({ label, address: derivedAddress }),
            });
            registered = true;
          }
        }

        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  mode,
                  registered,
                  address: derivedAddress,
                  index,
                  algorithm: algorithm ?? 'SECP256K1',
                  ...(include_seed ? { seed } : {}),
                  ...(wallet ? { wallet } : {}),
                  ...(!registered && register ? { warning: 'Wallet generated but not registered: API credentials are missing.' } : {}),
                },
                null,
                2
              ),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify({ error: error instanceof Error ? error.message : String(error) }, null, 2),
            },
          ],
        };
      }
    }
  );
}
