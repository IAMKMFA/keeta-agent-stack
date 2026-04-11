import type { FastifyInstance, FastifyPluginAsync, FastifyReply } from 'fastify';
import { z } from 'zod';
import { KtaOracleClient, KtaOracleRequestError, buildOraclePaymentPlaybook } from '@keeta-agent-sdk/keeta';
import { requireOperatorAccess, requireViewerAccess } from '../lib/auth.js';

const rateQuerySchema = z.object({
  currency: z.string().min(1).default('USD'),
  walletAddress: z.string().min(1).optional(),
});

const compareQuerySchema = z.object({
  from: z.enum(['swift', 'bankwire', 'stripe', 'visa', 'all']).optional(),
  amount: z.coerce.number().positive().optional(),
  currency: z.string().min(1).optional(),
});

const callToolBodySchema = z.record(z.unknown()).default({});
const paymentPlaybookBodySchema = z.object({
  amount: z.coerce.number().positive(),
  currency: z.string().min(1),
  walletAddress: z.string().optional(),
  recipientWallet: z.string().optional(),
  compareFrom: z.enum(['swift', 'bankwire', 'stripe', 'visa', 'all']).optional(),
  complianceRegion: z.string().optional(),
  includeSdkSnippet: z.boolean().optional(),
  network: z.enum(['main', 'test']).optional(),
});

function oracleClient(app: FastifyInstance): KtaOracleClient {
  return new KtaOracleClient({
    baseUrl: app.env.KTA_ORACLE_BASE_URL,
    timeoutMs: app.env.KTA_ORACLE_TIMEOUT_MS,
  });
}

function sendOracleError(error: unknown, reply: FastifyReply): void {
  if (error instanceof KtaOracleRequestError) {
    reply.status(502).send({
      error: {
        code: 'ORACLE_UPSTREAM_ERROR',
        message: error.message,
        status: error.status,
        endpoint: error.endpoint,
        body: error.body,
      },
    });
    return;
  }
  if (error instanceof Error) {
    reply.status(502).send({
      error: {
        code: 'ORACLE_PROXY_ERROR',
        message: error.message,
      },
    });
    return;
  }
  throw error;
}

export const oracleRoutes: FastifyPluginAsync = async (app) => {
  app.get('/oracle/status', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    try {
      const data = await oracleClient(app).getStatus();
      return { ok: true, data };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.get('/oracle/tools', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    try {
      const data = await oracleClient(app).getTools();
      return { ok: true, data };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.get('/oracle/rate', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const parsed = rateQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: parsed.error.message },
      });
    }
    try {
      const data = await oracleClient(app).getRate(parsed.data);
      return { ok: true, data };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.get('/oracle/compare', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    const parsed = compareQuerySchema.safeParse(req.query ?? {});
    if (!parsed.success) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: parsed.error.message },
      });
    }
    try {
      const data = await oracleClient(app).comparePaymentRails(parsed.data);
      return { ok: true, data };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.get('/oracle/mcp/tools', async (req, reply) => {
    if (!(await requireViewerAccess(app, req, reply))) {
      return;
    }
    try {
      const tools = await oracleClient(app).listMcpTools();
      return { ok: true, count: tools.length, tools };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.post('/oracle/mcp/tools/:name', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const params = z.object({ name: z.string().min(1) }).safeParse(req.params ?? {});
    if (!params.success) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: params.error.message },
      });
    }
    const body = callToolBodySchema.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: body.error.message },
      });
    }
    try {
      const data = await oracleClient(app).callMcpTool(params.data.name, body.data);
      return { ok: true, tool: params.data.name, data };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });

  app.post('/oracle/autopilot/payment-plan', async (req, reply) => {
    if (!(await requireOperatorAccess(app, req, reply))) {
      return;
    }
    const body = paymentPlaybookBodySchema.safeParse(req.body ?? {});
    if (!body.success) {
      return reply.status(400).send({
        error: { code: 'BAD_REQUEST', message: body.error.message },
      });
    }
    try {
      const plan = await buildOraclePaymentPlaybook(oracleClient(app), body.data);
      return { ok: true, plan };
    } catch (error) {
      sendOracleError(error, reply);
    }
  });
};
