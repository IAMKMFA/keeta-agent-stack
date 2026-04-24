import type { FastifyPluginAsync } from 'fastify';
import { z } from 'zod';
import { simulationRepo } from '@keeta-agent-stack/storage';
import { SimulationResultSchema } from '@keeta-agent-stack/types';
import { QUEUE_NAMES } from '@keeta-agent-stack/config';
import { enqueueJobWithTelemetry } from '../lib/job-tracing.js';
import { requireOperatorAccess, requireViewerAccess } from '../lib/auth.js';

const runBody = z.object({
  intentId: z.string().uuid(),
  routePlanId: z.string().uuid(),
  scenario: z.record(z.unknown()).optional(),
});

export const simulationsRoutes: FastifyPluginAsync = async (app) => {
  app.get('/simulations', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    return simulationRepo.listSimulationRuns(app.db, 200);
  });

  app.post('/simulations/run', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const parsed = runBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid body', details: parsed.error.flatten() },
      });
    }
    const job = await enqueueJobWithTelemetry(req, {
      queue: app.queues[QUEUE_NAMES.simulationRuns]!,
      jobName: 'sim',
      data: {
        intentId: parsed.data.intentId,
        routePlanId: parsed.data.routePlanId,
        scenario: parsed.data.scenario ?? {},
      },
      spanName: 'api.simulation.enqueue',
      attributes: {
        intentId: parsed.data.intentId,
        routePlanId: parsed.data.routePlanId,
      },
    });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.simulationRuns });
  });

  app.get('/simulations/:id', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
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
