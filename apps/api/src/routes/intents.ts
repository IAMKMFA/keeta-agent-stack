import type { FastifyPluginAsync } from 'fastify';
import { randomUUID } from 'node:crypto';
import { z } from 'zod';
import {
  ExecutionIntentSchema,
  type ExecutionIntent,
} from '@keeta-agent-sdk/types';
import { intentRepo } from '@keeta-agent-sdk/storage';
import { QUEUE_NAMES } from '@keeta-agent-sdk/config';

const createIntentBody = ExecutionIntentSchema.omit({ id: true, createdAt: true }).partial({
  strategyId: true,
  venueAllowlist: true,
  metadata: true,
});

export const intentsRoutes: FastifyPluginAsync = async (app) => {
  app.post('/intents', async (req, reply) => {
    const parsed = createIntentBody.safeParse(req.body);
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'VALIDATION_ERROR', message: 'Invalid intent', details: parsed.error.flatten() },
      });
    }
    const id = randomUUID();
    const intent: ExecutionIntent = {
      ...parsed.data,
      id,
      createdAt: new Date().toISOString(),
    };
    const full = ExecutionIntentSchema.parse(intent);
    await intentRepo.insertIntent(app.db, {
      walletId: full.walletId,
      ...(full.strategyId ? { strategyId: full.strategyId } : {}),
      status: 'created',
      payload: full as unknown as Record<string, unknown>,
    });
    app.telemetry.emit({ name: 'intent.created', payload: { intentId: id } });
    return reply.status(201).send(full);
  });

  app.get('/intents/:id', async (req, reply) => {
    const { id } = req.params as { id: string };
    const row = await intentRepo.getIntentById(app.db, id);
    if (!row) {
      return reply.status(404).send({ error: { code: 'NOT_FOUND', message: 'Intent not found' } });
    }
    return ExecutionIntentSchema.parse(row.payload);
  });

  app.post('/intents/:id/quote', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.queues[QUEUE_NAMES.quoteGeneration]!.add('quote', { intentId: id });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.quoteGeneration });
  });

  app.post('/intents/:id/route', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.queues[QUEUE_NAMES.routeGeneration]!.add('route', { intentId: id });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.routeGeneration });
  });

  app.post('/intents/:id/policy', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.queues[QUEUE_NAMES.policyEvaluation]!.add('policy', { intentId: id });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.policyEvaluation });
  });

  app.post('/intents/:id/execute', async (req, reply) => {
    const { id } = req.params as { id: string };
    const job = await app.queues[QUEUE_NAMES.executionProcessing]!.add('execute', { intentId: id });
    return reply.status(202).send({ jobId: job.id, queue: QUEUE_NAMES.executionProcessing });
  });
};
