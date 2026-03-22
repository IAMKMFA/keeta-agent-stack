import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { balanceRepo, walletRepo } from '@keeta-agent-sdk/storage';
import { getBalances } from '@keeta-agent-sdk/keeta';

const importBody = z.object({
  label: z.string().min(1),
  address: z.string().min(1),
});

export const walletsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/wallets/import', async (req, reply) => {
    const parsed = importBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: parsed.error.flatten() },
      });
    }
    const row = await walletRepo.insertWallet(app.db, {
      label: parsed.data.label,
      address: parsed.data.address,
    });
    return reply.status(201).send(row);
  });

  app.get('/wallets', async () => {
    return walletRepo.listWallets(app.db);
  });

  app.get('/wallets/:id/balances', async (req, reply) => {
    const { id } = req.params as { id: string };
    const w = await walletRepo.getWallet(app.db, id);
    if (!w) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Wallet not found' } });
    }
    const snaps = await balanceRepo.listBalancesForWallet(app.db, id);
    const stub = await getBalances(w.address);
    return { snapshots: snaps, keetaStub: stub };
  });
};
