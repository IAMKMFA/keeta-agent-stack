import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { WalletSettingsSchema } from '@keeta-agent-stack/types';
import { balanceRepo, policyRepo, walletRepo } from '@keeta-agent-stack/storage';
import { createKeetaWallet, getBalances, KeetaConnectionError } from '@keeta-agent-stack/keeta';
import { requireOperatorAccess, requireViewerAccess } from '../lib/auth.js';

const walletSettingsBody = WalletSettingsSchema.optional();

const importBody = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
  settings: walletSettingsBody,
});

const createBody = z.object({
  label: z.string().min(1),
  index: z.number().int().min(0).optional(),
  algorithm: z.enum(['SECP256K1', 'SECP256R1', 'ED25519']).optional(),
  includeSeed: z.boolean().optional(),
  settings: walletSettingsBody,
});

const importOrCreateBody = z.discriminatedUnion('mode', [
  z.object({
    mode: z.literal('import'),
    label: z.string().min(1),
    address: z.string().min(1),
    settings: walletSettingsBody,
  }),
  z.object({
    mode: z.literal('create'),
    label: z.string().min(1),
    index: z.number().int().min(0).optional(),
    algorithm: z.enum(['SECP256K1', 'SECP256R1', 'ED25519']).optional(),
    includeSeed: z.boolean().optional(),
    settings: walletSettingsBody,
  }),
]);

function normalizeWalletSettings(settings: z.infer<typeof WalletSettingsSchema> | undefined) {
  if (!settings || typeof settings.defaultPolicyPackId !== 'string') {
    return {};
  }
  return {
    defaultPolicyPackId: settings.defaultPolicyPackId,
  };
}

async function ensurePolicyPackExists(
  app: FastifyInstance,
  reply: FastifyReply,
  policyPackId: string | undefined | null
) {
  if (!policyPackId) {
    return true;
  }
  const pack = await policyRepo.getPolicyPackById(app.db, policyPackId);
  if (pack) {
    return true;
  }
  await reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy pack not found' } });
  return false;
}

export const walletsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/wallets', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = createBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid body',
          details: parsed.error.flatten(),
        },
      });
    }
    if (!(await ensurePolicyPackExists(app, reply, parsed.data.settings?.defaultPolicyPackId))) {
      return;
    }
    const created = createKeetaWallet({
      index: parsed.data.index,
      algorithm: parsed.data.algorithm,
    });
    const row = await walletRepo.insertWallet(app.db, {
      label: parsed.data.label,
      address: created.address,
      settings: normalizeWalletSettings(parsed.data.settings),
    });
    return reply.status(201).send({
      ...row,
      derivation: {
        index: created.index,
        algorithm: created.algorithm,
      },
      ...(parsed.data.includeSeed ? { seed: created.seed } : {}),
    });
  });

  app.post('/wallets/import-or-create', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = importOrCreateBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid body',
          details: parsed.error.flatten(),
        },
      });
    }
    if (!(await ensurePolicyPackExists(app, reply, parsed.data.settings?.defaultPolicyPackId))) {
      return;
    }

    if (parsed.data.mode === 'import') {
      const row = await walletRepo.insertWallet(app.db, {
        label: parsed.data.label,
        address: parsed.data.address,
        settings: normalizeWalletSettings(parsed.data.settings),
      });
      return reply.status(201).send({
        mode: 'import',
        wallet: row,
      });
    }

    const created = createKeetaWallet({
      index: parsed.data.index,
      algorithm: parsed.data.algorithm,
    });
    const row = await walletRepo.insertWallet(app.db, {
      label: parsed.data.label,
      address: created.address,
      settings: normalizeWalletSettings(parsed.data.settings),
    });
    return reply.status(201).send({
      mode: 'create',
      wallet: {
        ...row,
        derivation: {
          index: created.index,
          algorithm: created.algorithm,
        },
        ...(parsed.data.includeSeed ? { seed: created.seed } : {}),
      },
    });
  });

  app.post('/wallets/import', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = importBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: {
          code: 'VALIDATION_ERROR',
          message: 'Invalid body',
          details: parsed.error.flatten(),
        },
      });
    }
    if (!(await ensurePolicyPackExists(app, reply, parsed.data.settings?.defaultPolicyPackId))) {
      return;
    }
    const row = await walletRepo.insertWallet(app.db, {
      label: parsed.data.label,
      address: parsed.data.address,
      settings: normalizeWalletSettings(parsed.data.settings),
    });
    return reply.status(201).send(row);
  });

  app.get('/wallets', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return walletRepo.listWallets(app.db);
  });

  app.get('/wallets/:id/balances', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const w = await walletRepo.getWallet(app.db, id);
    if (!w) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
    }
    const snaps = await balanceRepo.listBalancesForWallet(app.db, id);
    try {
      const keeta = await getBalances(w.address, app.env.KEETA_NETWORK);
      return { snapshots: snaps, keeta, network: app.env.KEETA_NETWORK };
    } catch (e) {
      if (e instanceof KeetaConnectionError) {
        return reply.status(503).send({
          snapshots: snaps,
          error: { code: e.code, message: e.message },
          network: app.env.KEETA_NETWORK,
        });
      }
      throw e;
    }
  });
};
