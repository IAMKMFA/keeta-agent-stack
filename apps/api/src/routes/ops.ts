import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { metricsRepo, policyRepo, strategyRepo } from '@keeta-agent-sdk/storage';
import { requireAdminAccess, requireOperatorAccess } from '../lib/auth.js';

function strategyPolicyPackId(config: unknown): string | null {
  if (!config || typeof config !== 'object') {
    return null;
  }
  const value = (config as Record<string, unknown>).policyPackId;
  return typeof value === 'string' ? value : null;
}

export const opsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/ops/metrics', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const rows = await metricsRepo.listRecentMetricSamples(app.db, 500);
    return { samples: rows };
  });

  app.post('/ops/strategies/:id/pause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, true);
    return reply.status(204).send();
  });

  app.post('/ops/strategies/:id/unpause', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    await strategyRepo.setStrategyPaused(app.db, id, false);
    return reply.status(204).send();
  });

  app.get('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const strategy = await strategyRepo.getStrategyById(app.db, id);
    if (!strategy) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: strategyPolicyPackId(strategy.config),
    };
  });

  app.put('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const parsed = z
      .object({
        policyPackId: z.string().uuid(),
      })
      .safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({ error: { code: 'VALIDATION_ERROR', details: parsed.error.flatten() } });
    }
    const pack = await policyRepo.getPolicyPackById(app.db, parsed.data.policyPackId);
    if (!pack) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Policy pack not found' } });
    }
    const updated = await strategyRepo.setStrategyPolicyPackId(app.db, id, parsed.data.policyPackId);
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: strategyPolicyPackId(updated.config),
    };
  });

  app.delete('/ops/strategies/:id/policy-pack', async (req, reply) => {
    if (!(await requireAdminAccess(app, req, reply))) {
      return;
    }
    const { id } = req.params as { id: string };
    const updated = await strategyRepo.setStrategyPolicyPackId(app.db, id, null);
    if (!updated) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Strategy not found' } });
    }
    return {
      strategyId: id,
      policyPackId: null,
    };
  });
};
