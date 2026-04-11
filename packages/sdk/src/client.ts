import type {
  ExecutionIntent,
  PaymentAnchorDetail,
  PaymentAnchorStatus,
  PaymentAnchorSummary,
  PolicyDecision,
  RoutePlan,
  SimulationResult,
  EventStreamEvent,
  WebhookDelivery,
  WebhookSubscription,
} from '@keeta-agent-sdk/types';
import type {
  PolicyAnchorBondHint,
  PolicyConfig,
  PolicyIdentityHints,
  PolicyKeetaHints,
  PolicyPortfolioStats,
  PolicyRuleMetadata,
} from '@keeta-agent-sdk/policy';

export interface SdkClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: HeadersInit;
}

export type OracleCompareFrom = 'swift' | 'bankwire' | 'stripe' | 'visa' | 'all';

export interface OraclePaymentPlanRequest {
  amount: number;
  currency: string;
  walletAddress?: string;
  recipientWallet?: string;
  compareFrom?: OracleCompareFrom;
  complianceRegion?: string;
  includeSdkSnippet?: boolean;
  network?: 'main' | 'test';
}

export interface CreatePaymentAnchorRequest {
  adapterId: string;
  label: string;
  status?: PaymentAnchorStatus;
  corridorKey?: string;
  operatorRef?: string;
  publicLabel?: boolean;
  corridorConfig?: Record<string, unknown>;
  supportedAssets?: string[];
  commercialTerms?: {
    setupFeeNote?: string;
    volumeFeeBps?: number;
  };
  metadata?: Record<string, unknown>;
}

export interface AnchorBondReconcileRequest {
  paymentAnchorId?: string;
  adapterId?: string;
  reason?: string;
}

export interface AnchorOnboardingRunRequest {
  paymentAnchorId?: string;
  adapterId?: string;
  reason?: string;
  reconcileBond?: boolean;
}

export interface PolicyEvaluationContextOverrides {
  keetaHints?: PolicyKeetaHints;
  anchorBonds?: Record<string, PolicyAnchorBondHint>;
  portfolioStats?: PolicyPortfolioStats;
  identityHints?: PolicyIdentityHints;
  customRuleConfig?: Record<string, unknown>;
}

export interface PolicyEvaluateRequest {
  intentId?: string;
  intent?: ExecutionIntent;
  routePlan?: RoutePlan;
  reason: string;
  configOverrides?: Partial<PolicyConfig>;
  contextOverrides?: PolicyEvaluationContextOverrides;
}

export interface PolicyEvaluateResponse {
  decision: PolicyDecision;
  rules: PolicyRuleMetadata[];
  effectiveConfig: PolicyConfig;
}

export interface CreateWebhookRequest {
  targetUrl: string;
  eventTypes: string[];
  secret?: string;
  status?: 'active' | 'paused';
}

export type UpdateWebhookRequest = Partial<CreateWebhookRequest>;

async function parseJson<T>(res: Response | Promise<Response>): Promise<T> {
  const r = await res;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body}`);
  }
  return r.json() as Promise<T>;
}

export function createClient(opts: SdkClientOptions) {
  const fetchFn = opts.fetchImpl ?? fetch;
  const base = opts.baseUrl.replace(/\/$/, '');
  const request = (path: string, init: RequestInit = {}) => {
    const headers = new Headers(opts.defaultHeaders);
    if (init.headers) {
      const provided = new Headers(init.headers);
      provided.forEach((value, key) => headers.set(key, value));
    }
    return fetchFn(`${base}${path}`, {
      ...init,
      headers,
    });
  };
  const postJson = <T>(path: string, body: unknown) =>
    parseJson<T>(
      request(path, {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
  const getJson = <T>(path: string) => parseJson<T>(request(path));
  const patchJson = <T>(path: string, body: unknown) =>
    parseJson<T>(
      request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );

  return {
    health: () => getJson<{ ok: boolean }>('/health'),

    listPolicyRules: () => getJson<{ rules: PolicyRuleMetadata[] }>('/policy/rules'),

    evaluatePolicy: (body: PolicyEvaluateRequest) =>
      postJson<PolicyEvaluateResponse>('/policy/evaluate', body),

    listEvents: (params: { after?: string; eventType?: string; intentId?: string; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.after) query.set('after', params.after);
      if (params.eventType) query.set('eventType', params.eventType);
      if (params.intentId) query.set('intentId', params.intentId);
      if (typeof params.limit === 'number') query.set('limit', String(params.limit));
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      return getJson<{ events: EventStreamEvent[] }>(`/events${suffix}`);
    },

    listWebhooks: () => getJson<{ webhooks: WebhookSubscription[] }>('/ops/webhooks'),

    createWebhook: (body: CreateWebhookRequest) =>
      postJson<{ webhook: WebhookSubscription }>('/ops/webhooks', body),

    updateWebhook: (id: string, body: UpdateWebhookRequest) =>
      patchJson<{ webhook: WebhookSubscription }>(`/ops/webhooks/${id}`, body),

    listWebhookDeliveries: (params: { subscriptionId?: string; limit?: number } = {}) => {
      const query = new URLSearchParams();
      if (params.subscriptionId) query.set('subscriptionId', params.subscriptionId);
      if (typeof params.limit === 'number') query.set('limit', String(params.limit));
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      return getJson<{ deliveries: WebhookDelivery[] }>(`/ops/webhook-deliveries${suffix}`);
    },

    listAdapters: () => getJson<unknown>('/adapters'),

    createIntent: (body: Omit<ExecutionIntent, 'id' | 'createdAt'>) =>
      postJson<ExecutionIntent>('/intents', body),

    getIntent: (id: string) =>
      getJson<ExecutionIntent>(`/intents/${id}`),

    quoteIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        request(`/intents/${id}/quote`, { method: 'POST' })
      ),

    routeIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        request(`/intents/${id}/route`, { method: 'POST' })
      ),

    policyIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        request(`/intents/${id}/policy`, { method: 'POST' })
      ),

    executeIntent: (id: string) =>
      parseJson<{ jobId: string }>(
        request(`/intents/${id}/execute`, { method: 'POST' })
      ),

    runSimulation: (body: { intentId: string; routePlanId: string }) =>
      postJson<{ jobId: string }>('/simulations/run', body),

    getSimulation: (id: string) =>
      getJson<SimulationResult>(`/simulations/${id}`),

    oracleStatus: () => getJson<unknown>('/oracle/status'),

    oracleTools: () => getJson<unknown>('/oracle/tools'),

    oracleRate: (params: { currency: string; walletAddress?: string }) => {
      const query = new URLSearchParams();
      query.set('currency', params.currency);
      if (params.walletAddress) query.set('walletAddress', params.walletAddress);
      return getJson<unknown>(`/oracle/rate?${query.toString()}`);
    },

    oracleCompare: (params: { from?: OracleCompareFrom; amount?: number; currency?: string } = {}) => {
      const query = new URLSearchParams();
      if (params.from) query.set('from', params.from);
      if (typeof params.amount === 'number') query.set('amount', String(params.amount));
      if (params.currency) query.set('currency', params.currency);
      const suffix = query.size > 0 ? `?${query.toString()}` : '';
      return getJson<unknown>(`/oracle/compare${suffix}`);
    },

    oracleListMcpTools: () => getJson<unknown>('/oracle/mcp/tools'),

    oracleCallMcpTool: (name: string, args: Record<string, unknown>) =>
      postJson<unknown>(`/oracle/mcp/tools/${encodeURIComponent(name)}`, args),

    oraclePaymentPlan: (body: OraclePaymentPlanRequest) =>
      postJson<unknown>('/oracle/autopilot/payment-plan', body),

    listAnchors: () => getJson<PaymentAnchorSummary[]>('/anchors'),

    getAnchor: (id: string) => getJson<PaymentAnchorDetail>(`/anchors/${id}`),

    createAnchor: (body: CreatePaymentAnchorRequest) =>
      postJson<PaymentAnchorSummary>('/anchors', body),

    updateAnchor: (id: string, body: Partial<CreatePaymentAnchorRequest>) =>
      patchJson<PaymentAnchorSummary>(`/anchors/${id}`, body),

    updateAnchorStatus: (id: string, status: PaymentAnchorStatus) =>
      postJson<PaymentAnchorSummary>(`/anchors/${id}/status`, { status }),

    updateAnchorBond: (
      id: string,
      body: {
        amountAtomic: string;
        assetId?: string;
        delayDays: 30 | 90;
        status: 'pending_lock' | 'active' | 'withdrawal_requested' | 'released' | 'failed_verification';
        lockTxHash?: string;
        lockAccount?: string;
        withdrawalRequestedAt?: string;
        activatedAt?: string;
        releasedAt?: string;
        verified?: boolean;
        verificationSource?: 'database' | 'keeta';
        verificationDetails?: Record<string, unknown>;
      }
    ) => patchJson<PaymentAnchorSummary>(`/anchors/${id}/bond`, body),

    reconcileAnchors: (body: AnchorBondReconcileRequest = {}) =>
      postJson<{ jobId: string; queue: string }>('/anchors/reconcile', body),

    reconcileAnchor: (id: string) =>
      postJson<{ jobId: string; queue: string; paymentAnchorId: string }>(`/anchors/${id}/reconcile`, {}),

    runAnchorOnboarding: (body: AnchorOnboardingRunRequest = {}) =>
      postJson<{ jobId: string; queue: string }>('/anchors/onboarding/run', body),

    runAnchorOnboardingForAnchor: (
      id: string,
      body: Omit<AnchorOnboardingRunRequest, 'paymentAnchorId' | 'adapterId'> = {}
    ) =>
      postJson<{ jobId: string; queue: string; paymentAnchorId: string }>(`/anchors/${id}/onboarding/run`, body),
  };
}
