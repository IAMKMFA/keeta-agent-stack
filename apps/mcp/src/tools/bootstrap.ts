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
}
