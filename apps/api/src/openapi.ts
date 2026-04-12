type JsonSchema = Record<string, unknown>;

function objectSchema(
  properties: Record<string, JsonSchema>,
  required: string[] = []
): JsonSchema {
  return {
    type: 'object',
    properties,
    ...(required.length > 0 ? { required } : {}),
    additionalProperties: true,
  };
}

const uuidSchema: JsonSchema = { type: 'string', format: 'uuid' };
const dateTimeSchema: JsonSchema = { type: 'string', format: 'date-time' };

const eventSchema = objectSchema(
  {
    id: uuidSchema,
    source: { type: 'string', enum: ['audit', 'anchor'] },
    eventType: { type: 'string' },
    intentId: uuidSchema,
    paymentAnchorId: uuidSchema,
    executionId: uuidSchema,
    payload: { type: 'object', additionalProperties: true },
    correlationId: { type: 'string' },
    createdAt: dateTimeSchema,
  },
  ['id', 'source', 'eventType', 'payload', 'createdAt']
);

const webhookSubscriptionSchema = objectSchema(
  {
    id: uuidSchema,
    targetUrl: { type: 'string', format: 'uri' },
    eventTypes: { type: 'array', items: { type: 'string' } },
    status: { type: 'string', enum: ['active', 'paused'] },
    secretPresent: { type: 'boolean' },
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
  ['id', 'targetUrl', 'eventTypes', 'status', 'secretPresent', 'createdAt', 'updatedAt']
);

const webhookDeliverySchema = objectSchema(
  {
    id: uuidSchema,
    subscriptionId: uuidSchema,
    eventSource: { type: 'string', enum: ['audit', 'anchor'] },
    eventId: uuidSchema,
    auditEventId: uuidSchema,
    status: { type: 'string', enum: ['pending', 'delivered', 'failed'] },
    attemptCount: { type: 'integer', minimum: 0 },
    responseStatus: { type: 'integer' },
    responseBody: { type: 'string' },
    lastError: { type: 'string' },
    deliveredAt: dateTimeSchema,
    nextAttemptAt: dateTimeSchema,
    createdAt: dateTimeSchema,
    updatedAt: dateTimeSchema,
  },
  ['id', 'subscriptionId', 'eventId', 'status', 'attemptCount', 'createdAt', 'updatedAt']
);

const acceptedJobSchema = objectSchema(
  {
    jobId: { type: 'string' },
    queue: { type: 'string' },
    paymentAnchorId: uuidSchema,
  },
  ['jobId']
);

const errorSchema = objectSchema(
  {
    error: objectSchema(
      {
        code: { type: 'string' },
        message: { type: 'string' },
        details: { type: 'object', additionalProperties: true },
      },
      ['code']
    ),
  },
  ['error']
);

const security = [{ OpsKey: [] }, { BearerAuth: [] }];

export function buildOpenApiDocument(options: { serverUrl?: string } = {}) {
  return {
    openapi: '3.1.0',
    info: {
      title: 'Keeta Agent SDK API',
      version: '0.0.1',
      description:
        'Keeta-native control plane for intents, routing, policy, anchors, event streaming, webhooks, and oracle-assisted payment flows.',
    },
    servers: [
      {
        url: options.serverUrl ?? 'http://localhost:3001',
        description: 'Configured API server',
      },
    ],
    tags: [
      { name: 'Health', description: 'Liveness and environment status.' },
      { name: 'Adapters', description: 'Registered execution venues and health.' },
      { name: 'Wallets', description: 'Wallet import and balance inspection.' },
      { name: 'Intents', description: 'Intent lifecycle orchestration.' },
      { name: 'Routes', description: 'Route plan inspection.' },
      { name: 'Executions', description: 'Execution history.' },
      { name: 'Policy', description: 'Policy discovery and preview evaluation.' },
      { name: 'Anchors', description: 'Payment anchor lifecycle, bonds, and onboarding.' },
      { name: 'Events', description: 'Audit and anchor lifecycle event feeds.' },
      { name: 'Webhooks', description: 'Push delivery subscriptions for downstream agents.' },
      { name: 'Oracle', description: 'Oracle-backed rate, compare, MCP, and autopilot flows.' },
      { name: 'Simulations', description: 'Scenario simulation scheduling and retrieval.' },
      { name: 'Ops', description: 'Operational metrics and strategy controls.' },
    ],
    components: {
      securitySchemes: {
        OpsKey: {
          type: 'apiKey',
          in: 'header',
          name: 'x-ops-key',
          description: 'Operator key for ops-only endpoints and event streaming.',
        },
        BearerAuth: {
          type: 'http',
          scheme: 'bearer',
          bearerFormat: 'API token',
        },
      },
      schemas: {
        Error: errorSchema,
        AcceptedJob: acceptedJobSchema,
        EventStreamEvent: eventSchema,
        WebhookSubscription: webhookSubscriptionSchema,
        WebhookDelivery: webhookDeliverySchema,
        GenericObject: { type: 'object', additionalProperties: true },
      },
    },
    paths: {
      '/health': {
        get: {
          tags: ['Health'],
          summary: 'Check API health',
          responses: {
            '200': {
              description: 'API, database, and Redis are healthy.',
              content: {
                'application/json': {
                  schema: objectSchema(
                    {
                      ok: { type: 'boolean' },
                      db: { type: 'boolean' },
                      redis: { type: 'boolean' },
                    },
                    ['ok', 'db', 'redis']
                  ),
                },
              },
            },
            '503': { description: 'Service unavailable', content: { 'application/json': { schema: errorSchema } } },
          },
        },
      },
      '/chain/health': {
        get: {
          tags: ['Health'],
          summary: 'Read Keeta chain health',
          security,
          responses: {
            '200': {
              description: 'Chain health snapshot',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
      },
      '/config/modes': {
        get: {
          tags: ['Health'],
          summary: 'Read runtime mode configuration',
          security,
          responses: {
            '200': {
              description: 'Runtime mode flags',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
      },
      '/strategy-templates': {
        get: {
          tags: ['Ops'],
          summary: 'List strategy templates',
          security,
          responses: {
            '200': {
              description: 'Strategy template rows',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } },
            },
          },
        },
      },
      '/adapters': {
        get: {
          tags: ['Adapters'],
          summary: 'List registered adapters',
          responses: {
            '200': {
              description: 'Adapter list',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } },
            },
          },
        },
      },
      '/adapters/health': {
        get: {
          tags: ['Adapters'],
          summary: 'Inspect adapter health',
          responses: {
            '200': {
              description: 'Adapter health view',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } },
            },
          },
        },
      },
      '/wallets': {
        post: {
          tags: ['Wallets'],
          summary: 'Create and register a wallet',
          description: 'Generates new key material server-side, derives an address, registers it, and optionally returns the seed once.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': {
              description: 'Wallet created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
        get: {
          tags: ['Wallets'],
          summary: 'List wallets',
          responses: {
            '200': {
              description: 'Wallet summaries',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } },
            },
          },
        },
      },
      '/wallets/import': {
        post: {
          tags: ['Wallets'],
          summary: 'Import a wallet',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': {
              description: 'Wallet imported',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
      },
      '/wallets/import-or-create': {
        post: {
          tags: ['Wallets'],
          summary: 'Import an existing wallet or create and register a new wallet',
          description: 'Discriminated union endpoint with mode=import|create to unify wallet registration flows.',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': {
              description: 'Wallet imported or created',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
      },
      '/wallets/{id}/balances': {
        get: {
          tags: ['Wallets'],
          summary: 'Read balances for a wallet',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Balance snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/intents': {
        get: {
          tags: ['Intents'],
          summary: 'List intents',
          responses: {
            '200': { description: 'Intent records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } } },
          },
        },
        post: {
          tags: ['Intents'],
          summary: 'Create an intent',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': { description: 'Intent created', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/intents/{id}': {
        get: {
          tags: ['Intents'],
          summary: 'Get an intent',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Intent detail', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
            '404': { description: 'Not found', content: { 'application/json': { schema: errorSchema } } },
          },
        },
      },
      '/intents/{id}/quote': {
        post: {
          tags: ['Intents'],
          summary: 'Queue quote generation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: { '202': { description: 'Quote job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/intents/{id}/route': {
        post: {
          tags: ['Intents'],
          summary: 'Queue route generation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: { '202': { description: 'Route job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/intents/{id}/policy': {
        post: {
          tags: ['Intents'],
          summary: 'Queue policy evaluation',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: { '202': { description: 'Policy job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/intents/{id}/execute': {
        post: {
          tags: ['Intents'],
          summary: 'Queue execution',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: { '202': { description: 'Execution job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/routes': {
        get: {
          tags: ['Routes'],
          summary: 'List route plans',
          responses: {
            '200': { description: 'Route plans', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } } },
          },
        },
      },
      '/executions': {
        get: {
          tags: ['Executions'],
          summary: 'List executions',
          responses: {
            '200': { description: 'Execution records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } } },
          },
        },
      },
      '/simulations': {
        get: {
          tags: ['Simulations'],
          summary: 'List simulations',
          responses: {
            '200': { description: 'Simulation records', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } } },
          },
        },
      },
      '/simulations/run': {
        post: {
          tags: ['Simulations'],
          summary: 'Queue a simulation run',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: { '202': { description: 'Simulation job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/simulations/{id}': {
        get: {
          tags: ['Simulations'],
          summary: 'Get a simulation result',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Simulation result', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/policy/rules': {
        get: {
          tags: ['Policy'],
          summary: 'List active policy rules',
          security,
          responses: {
            '200': { description: 'Registered rules', content: { 'application/json': { schema: objectSchema({ rules: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } }, ['rules']) } } },
          },
        },
      },
      '/policy/evaluate': {
        post: {
          tags: ['Policy'],
          summary: 'Preview policy evaluation',
          security,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '200': { description: 'Policy decision preview', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/policy/packs': {
        get: {
          tags: ['Policy'],
          summary: 'List persisted policy packs',
          security,
          responses: {
            '200': {
              description: 'Persisted policy packs',
              content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } },
            },
          },
        },
        post: {
          tags: ['Policy'],
          summary: 'Create a persisted policy pack',
          security,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': {
              description: 'Created policy pack',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
      },
      '/policy/packs/{id}': {
        patch: {
          tags: ['Policy'],
          summary: 'Update a persisted policy pack',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '200': {
              description: 'Updated policy pack',
              content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
            },
          },
        },
        delete: {
          tags: ['Policy'],
          summary: 'Delete a persisted policy pack',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '204': { description: 'Policy pack deleted' },
          },
        },
      },
      '/anchors': {
        get: {
          tags: ['Anchors'],
          summary: 'List payment anchors',
          responses: {
            '200': { description: 'Anchor summaries', content: { 'application/json': { schema: { type: 'array', items: { $ref: '#/components/schemas/GenericObject' } } } } },
          },
        },
        post: {
          tags: ['Anchors'],
          summary: 'Create a payment anchor',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '201': { description: 'Anchor created', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/anchors/{id}': {
        get: {
          tags: ['Anchors'],
          summary: 'Get anchor detail',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Anchor detail with bonds and events', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
        patch: {
          tags: ['Anchors'],
          summary: 'Update anchor metadata',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '200': { description: 'Anchor updated', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/anchors/{id}/status': {
        post: {
          tags: ['Anchors'],
          summary: 'Advance anchor status',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: objectSchema({ status: { type: 'string' } }, ['status']) } },
          },
          responses: {
            '200': { description: 'Anchor summary', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/anchors/{id}/bond': {
        patch: {
          tags: ['Anchors'],
          summary: 'Update the current anchor bond',
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '200': { description: 'Anchor summary with updated bond', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/anchors/reconcile': {
        post: {
          tags: ['Anchors'],
          summary: 'Queue anchor bond reconciliation',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: { '202': { description: 'Reconciliation job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/anchors/onboarding/run': {
        post: {
          tags: ['Anchors'],
          summary: 'Queue anchor onboarding evaluation',
          requestBody: {
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: { '202': { description: 'Onboarding job queued', content: { 'application/json': { schema: acceptedJobSchema } } } },
        },
      },
      '/events': {
        get: {
          tags: ['Events'],
          summary: 'List recent audit and anchor lifecycle events',
          security,
          parameters: [
            { name: 'after', in: 'query', required: false, schema: dateTimeSchema },
            { name: 'eventType', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'intentId', in: 'query', required: false, schema: uuidSchema },
            { name: 'paymentAnchorId', in: 'query', required: false, schema: uuidSchema },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500 } },
          ],
          responses: {
            '200': {
              description: 'Event list',
              content: {
                'application/json': {
                  schema: objectSchema({ events: { type: 'array', items: { $ref: '#/components/schemas/EventStreamEvent' } } }, ['events']),
                },
              },
            },
          },
        },
      },
      '/events/stream': {
        get: {
          tags: ['Events'],
          summary: 'Subscribe to the live event stream over SSE',
          security,
          parameters: [
            { name: 'after', in: 'query', required: false, schema: dateTimeSchema },
            { name: 'eventType', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'intentId', in: 'query', required: false, schema: uuidSchema },
            { name: 'paymentAnchorId', in: 'query', required: false, schema: uuidSchema },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500 } },
          ],
          responses: {
            '200': {
              description: 'Server-sent events stream.',
              content: { 'text/event-stream': { schema: { type: 'string' } } },
            },
          },
        },
      },
      '/ops/webhooks': {
        get: {
          tags: ['Webhooks'],
          summary: 'List webhook subscriptions',
          security,
          responses: {
            '200': {
              description: 'Webhook subscriptions',
              content: {
                'application/json': {
                  schema: objectSchema({ webhooks: { type: 'array', items: { $ref: '#/components/schemas/WebhookSubscription' } } }, ['webhooks']),
                },
              },
            },
          },
        },
        post: {
          tags: ['Webhooks'],
          summary: 'Create a webhook subscription',
          security,
          requestBody: {
            required: true,
            content: { 'application/json': { schema: objectSchema({ targetUrl: { type: 'string', format: 'uri' }, eventTypes: { type: 'array', items: { type: 'string' } }, secret: { type: 'string' }, status: { type: 'string', enum: ['active', 'paused'] } }, ['targetUrl', 'eventTypes']) } },
          },
          responses: {
            '201': {
              description: 'Webhook subscription created',
              content: { 'application/json': { schema: objectSchema({ webhook: { $ref: '#/components/schemas/WebhookSubscription' } }, ['webhook']) } },
            },
          },
        },
      },
      '/ops/webhooks/{id}': {
        patch: {
          tags: ['Webhooks'],
          summary: 'Update a webhook subscription',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: {
            '200': {
              description: 'Updated subscription',
              content: { 'application/json': { schema: objectSchema({ webhook: { $ref: '#/components/schemas/WebhookSubscription' } }, ['webhook']) } },
            },
          },
        },
      },
      '/ops/webhook-deliveries': {
        get: {
          tags: ['Webhooks'],
          summary: 'List webhook delivery attempts',
          security,
          parameters: [
            { name: 'subscriptionId', in: 'query', required: false, schema: uuidSchema },
            { name: 'limit', in: 'query', required: false, schema: { type: 'integer', minimum: 1, maximum: 500 } },
          ],
          responses: {
            '200': {
              description: 'Delivery records',
              content: {
                'application/json': {
                  schema: objectSchema({ deliveries: { type: 'array', items: { $ref: '#/components/schemas/WebhookDelivery' } } }, ['deliveries']),
                },
              },
            },
          },
        },
      },
      '/ops/metrics': {
        get: {
          tags: ['Ops'],
          summary: 'Read operational metrics',
          security,
          responses: {
            '200': { description: 'Metrics snapshot', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/ops/strategies/{id}/policy-pack': {
        get: {
          tags: ['Ops'],
          summary: 'Read the assigned policy pack for a strategy',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Strategy policy-pack assignment', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
        put: {
          tags: ['Ops'],
          summary: 'Assign a persisted policy pack to a strategy',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: objectSchema({ policyPackId: uuidSchema }, ['policyPackId']) } },
          },
          responses: {
            '200': { description: 'Updated strategy policy-pack assignment', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
        delete: {
          tags: ['Ops'],
          summary: 'Clear the assigned policy pack for a strategy',
          security,
          parameters: [{ name: 'id', in: 'path', required: true, schema: uuidSchema }],
          responses: {
            '200': { description: 'Cleared strategy policy-pack assignment', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } },
          },
        },
      },
      '/oracle/status': {
        get: {
          tags: ['Oracle'],
          summary: 'Read oracle availability',
          responses: { '200': { description: 'Oracle status', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/tools': {
        get: {
          tags: ['Oracle'],
          summary: 'List oracle helper tools',
          responses: { '200': { description: 'Oracle tools', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/rate': {
        get: {
          tags: ['Oracle'],
          summary: 'Quote a currency rate',
          parameters: [
            { name: 'currency', in: 'query', required: true, schema: { type: 'string' } },
            { name: 'walletAddress', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Rate quote', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/compare': {
        get: {
          tags: ['Oracle'],
          summary: 'Compare funding rails',
          parameters: [
            { name: 'from', in: 'query', required: false, schema: { type: 'string' } },
            { name: 'amount', in: 'query', required: false, schema: { type: 'number' } },
            { name: 'currency', in: 'query', required: false, schema: { type: 'string' } },
          ],
          responses: { '200': { description: 'Comparison payload', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/mcp/tools': {
        get: {
          tags: ['Oracle'],
          summary: 'List Oracle MCP tools',
          responses: { '200': { description: 'Oracle MCP tools', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/mcp/tools/{name}': {
        post: {
          tags: ['Oracle'],
          summary: 'Call an Oracle MCP tool',
          parameters: [{ name: 'name', in: 'path', required: true, schema: { type: 'string' } }],
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: { '200': { description: 'Oracle MCP result', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
      '/oracle/autopilot/payment-plan': {
        post: {
          tags: ['Oracle'],
          summary: 'Generate an oracle-assisted payment plan',
          requestBody: {
            required: true,
            content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } },
          },
          responses: { '200': { description: 'Payment plan', content: { 'application/json': { schema: { $ref: '#/components/schemas/GenericObject' } } } } },
        },
      },
    },
  };
}
