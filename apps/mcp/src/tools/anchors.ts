import { z } from 'zod';
import type { McpServer } from '@modelcontextprotocol/sdk/server/mcp.js';

const DEFAULT_API_URL = 'http://localhost:3001';

function getApiUrl(): string {
  return (process.env.API_URL ?? process.env.KEETA_AGENT_API_URL ?? DEFAULT_API_URL).replace(/\/$/, '');
}

async function requestJson(path: string, init?: RequestInit): Promise<unknown> {
  const headers: Record<string, string> = {
    Accept: 'application/json',
    ...(init?.headers ? (init.headers as Record<string, string>) : {}),
  };
  if (process.env.OPS_API_KEY) {
    headers['x-ops-key'] = process.env.OPS_API_KEY;
  }
  const response = await fetch(`${getApiUrl()}${path}`, {
    ...init,
    headers,
  });
  const text = await response.text();
  const parsed = text.length > 0 ? JSON.parse(text) : null;
  if (!response.ok) {
    throw new Error(typeof parsed?.error?.message === 'string' ? parsed.error.message : `HTTP ${response.status}`);
  }
  return parsed;
}

function render(payload: unknown) {
  return {
    content: [
      {
        type: 'text' as const,
        text: JSON.stringify(payload, null, 2),
      },
    ],
  };
}

export function registerAnchorTools(server: McpServer): void {
  server.tool('keeta_list_payment_anchors', 'List payment anchors known to the Keeta Agent Stack API.', {}, async () => {
    try {
      return render(await requestJson('/anchors'));
    } catch (error) {
      return render({ error: error instanceof Error ? error.message : String(error) });
    }
  });

  server.tool(
    'keeta_get_payment_anchor',
    'Get one payment anchor with current bond posture and recent events.',
    { id: z.string().uuid() },
    async ({ id }) => {
      try {
        return render(await requestJson(`/anchors/${id}`));
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_create_payment_anchor_draft',
    'Create a draft payment anchor record in the local Keeta Agent Stack API.',
    {
      adapter_id: z.string().min(1),
      label: z.string().min(1),
      corridor_key: z.string().optional(),
      operator_ref: z.string().optional(),
      supported_assets: z.array(z.string()).default([]),
      setup_fee_note: z.string().optional(),
      volume_fee_bps: z.number().nonnegative().optional(),
    },
    async ({ adapter_id, label, corridor_key, operator_ref, supported_assets, setup_fee_note, volume_fee_bps }) => {
      try {
        return render(
          await requestJson('/anchors', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              adapterId: adapter_id,
              label,
              status: 'draft',
              corridorKey: corridor_key,
              operatorRef: operator_ref,
              supportedAssets: supported_assets,
              commercialTerms: {
                ...(setup_fee_note ? { setupFeeNote: setup_fee_note } : {}),
                ...(typeof volume_fee_bps === 'number' ? { volumeFeeBps: volume_fee_bps } : {}),
              },
            }),
          })
        );
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_update_payment_anchor_status',
    'Advance a payment anchor through its lifecycle using the local Keeta Agent Stack API.',
    {
      id: z.string().uuid(),
      status: z.enum([
        'draft',
        'commercial_defined',
        'bond_required',
        'bond_pending_lock',
        'active',
        'withdrawal_requested',
        'released',
        'suspended',
      ]),
    },
    async ({ id, status }) => {
      try {
        return render(
          await requestJson(`/anchors/${id}/status`, {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({ status }),
          })
        );
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_update_payment_anchor_bond',
    'Create or update the current bond record for a payment anchor in the local Keeta Agent Stack API.',
    {
      id: z.string().uuid(),
      amount_atomic: z.string().min(1),
      asset_id: z.string().default('KTA'),
      delay_days: z.union([z.literal(30), z.literal(90)]),
      status: z.enum([
        'pending_lock',
        'active',
        'withdrawal_requested',
        'released',
        'failed_verification',
      ]),
      lock_tx_hash: z.string().optional(),
      lock_account: z.string().optional(),
      withdrawal_requested_at: z.string().datetime().optional(),
      activated_at: z.string().datetime().optional(),
      released_at: z.string().datetime().optional(),
      verified: z.boolean().optional(),
      verification_source: z.enum(['database', 'keeta']).optional(),
      verification_details: z.record(z.unknown()).optional(),
    },
    async ({
      id,
      amount_atomic,
      asset_id,
      delay_days,
      status,
      lock_tx_hash,
      lock_account,
      withdrawal_requested_at,
      activated_at,
      released_at,
      verified,
      verification_source,
      verification_details,
    }) => {
      try {
        return render(
          await requestJson(`/anchors/${id}/bond`, {
            method: 'PATCH',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              amountAtomic: amount_atomic,
              assetId: asset_id,
              delayDays: delay_days,
              status,
              lockTxHash: lock_tx_hash,
              lockAccount: lock_account,
              withdrawalRequestedAt: withdrawal_requested_at,
              activatedAt: activated_at,
              releasedAt: released_at,
              verified,
              verificationSource: verification_source,
              verificationDetails: verification_details,
            }),
          })
        );
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_reconcile_payment_anchor_bonds',
    'Queue a bond reconciliation pass for all anchors or one specific anchor.',
    {
      payment_anchor_id: z.string().uuid().optional(),
      adapter_id: z.string().optional(),
      reason: z.string().optional(),
    },
    async ({ payment_anchor_id, adapter_id, reason }) => {
      try {
        return render(
          await requestJson('/anchors/reconcile', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentAnchorId: payment_anchor_id,
              adapterId: adapter_id,
              reason: reason ?? 'manual_mcp',
            }),
          })
        );
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );

  server.tool(
    'keeta_run_payment_anchor_onboarding',
    'Queue worker-driven onboarding progression for all anchors or one specific anchor.',
    {
      payment_anchor_id: z.string().uuid().optional(),
      adapter_id: z.string().optional(),
      reason: z.string().optional(),
      reconcile_bond: z.boolean().optional(),
    },
    async ({ payment_anchor_id, adapter_id, reason, reconcile_bond }) => {
      try {
        return render(
          await requestJson('/anchors/onboarding/run', {
            method: 'POST',
            headers: { 'Content-Type': 'application/json' },
            body: JSON.stringify({
              paymentAnchorId: payment_anchor_id,
              adapterId: adapter_id,
              reason: reason ?? 'manual_mcp',
              reconcileBond: reconcile_bond ?? true,
            }),
          })
        );
      } catch (error) {
        return render({ error: error instanceof Error ? error.message : String(error) });
      }
    }
  );
}
