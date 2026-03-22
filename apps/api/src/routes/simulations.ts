import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { simulationRepo } from '@keeta-agent-sdk/storage';
import { SimulationResultSchema } from '@keeta-agent-sdk/types';
import { QUEUE_NAMES } from '@keeta-agent-sdk/config';

const runBody = z.object({
  intentId: z.string().uuid(),
  routePlanId: z.string().uuid(),
  scenario: z.record(z.unknown()).optional(),
});

export const simulationsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/simulations/run', async (req, reply) => {
    const parsed = runBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: parsed.error.flatten() },
      });
    }
    const job = await app.queues[QUEUE_NAMES.simulationRuns]!.add('sim', {
      intentId: parsed.data.intentId,
      routePlanId: parsed.data.routePlanId,
      scenario: parsed.data.scenario ?? {},
    });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.simulationRuns });
  });

  app.get('/simulations/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const run = await simulationRepo.getSimulationRun(app.db, id);
    if (!run) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Simulation not found' } });
    }
    const result = await simulationRepo.getSimulationResultByRun(app.db, id);
    if (!result) {
      return { run, result: null };
    }
    return {
      run,
      result: SimulationResultSchema.parse(result.payload),
    };
  });
};
