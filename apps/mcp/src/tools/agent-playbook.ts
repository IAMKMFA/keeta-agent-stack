import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';
import { KtaOracleClient, buildOraclePaymentPlaybook } from '@keeta-agent-sdk/keeta';

const DEFAULT_TIMEOUT_MS = 10_000;

function getOracleClient(): KtaOracleClient {
  const timeoutRaw = process.env.KTA_ORACLE_TIMEOUT_MS;
  const timeout = timeoutRaw ? Number(timeoutRaw) : DEFAULT_TIMEOUT_MS;
  return new KtaOracleClient({
    baseUrl: process.env.KTA_ORACLE_BASE_URL,
    timeoutMs: Number.isFinite(timeout) && timeout > 0 ? timeout : DEFAULT_TIMEOUT_MS,
  });
}

export function registerAgentPlaybookTools(server: McpServer): void {
  server.tool(
    'keeta_agent_payment_playbook',
    'One-call payment planning for agents: rates, rail comparison, exchange instructions, optional compliance and SDK execution snippet.',
    {
      amount: z.number().positive(),
      currency: z.string().min(1),
      wallet_address: z.string().optional(),
      recipient_wallet: z.string().optional(),
      compare_from: z.enum(['swift', 'bankwire', 'stripe', 'visa', 'all']).optional(),
      compliance_region: z.string().optional(),
      include_sdk_snippet: z.boolean().default(true),
      network: z.enum(['main', 'test']).default('test'),
    },
    async ({
      amount,
      currency,
      wallet_address,
      recipient_wallet,
      compare_from,
      compliance_region,
      include_sdk_snippet,
      network,
    }) => {
      try {
        const playbook = await buildOraclePaymentPlaybook(getOracleClient(), {
          amount,
          currency,
          walletAddress: wallet_address,
          recipientWallet: recipient_wallet,
          compareFrom: compare_from,
          complianceRegion: compliance_region,
          includeSdkSnippet: include_sdk_snippet,
          network,
        });
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(playbook, null, 2),
            },
          ],
        };
      } catch (error) {
        return {
          content: [
            {
              type: 'text',
              text: JSON.stringify(
                {
                  error: error instanceof Error ? error.message : String(error),
                },
                null,
                2
              ),
            },
          ],
        };
      }
    }
  );

  server.tool(
    'keeta_anchor_commercial_model',
    'Return the structured commercial and operational model for building a Keeta payment anchor.',
    {
      partner_size: z.enum(['small', 'medium', 'large']).default('medium'),
      withdrawal_delay_days: z.enum(['30', '90']).default('90'),
    },
    async ({ partner_size, withdrawal_delay_days }) => {
      const bondGuidance =
        partner_size === 'small'
          ? 'Use a smaller KTA reserve sized for early-stage partner throughput.'
          : partner_size === 'large'
            ? 'Use a larger KTA reserve sized for institutional traffic and failure coverage.'
            : 'Use a medium KTA reserve sized for sustained production payment volume.';

      return {
        content: [
          {
            type: 'text',
            text: JSON.stringify(
              {
                model: {
                  setupFee: 'Integration development and quality-control fee; stored as commercial metadata.',
                  bond: {
                    asset: 'KTA',
                    withdrawalDelayDays: Number(withdrawal_delay_days),
                    guidance: bondGuidance,
                    purpose:
                      'Reserve instrument for anchor reliability and remediation posture; not a subscription fee.',
                  },
                  volumeFee: 'Per-volume basis-point fee applied to routed payment activity.',
                },
                recommendedRecords: ['payment_anchor', 'anchor_bond', 'anchor_event'],
                activationChecklist: [
                  'Register anchor identity and corridor metadata.',
                  'Record commercial terms including setup fee note and volume fee bps.',
                  'Lock or register the KTA bond reference with 30d or 90d delay.',
                  'Mark anchor and bond active only after verification passes.',
                ],
              },
              null,
              2
            ),
          },
        ],
      };
    }
  );
}
