import type {
  AdapterSummary,
  AvailableRail,
  ChainHealthResponse,
  ConfigModes,
  ExecutionIntent,
  PaymentAnchorDetail,
  PaymentAnchorStatus,
  PaymentAnchorSummary,
  PolicyDecision,
  PolicyPackSource,
  RoutePlan,
  SimulationResult,
  EventStreamEvent,
  OpsMetricSample,
  StrategyTemplate,
  WalletBalancesResponse,
  WalletSettings,
  WebhookDelivery,
  WebhookSubscription,
} from '@keeta-agent-sdk/types';
import {
  listBuiltinRailMetadata,
  listBuiltinRailsByTransport,
  mergeRailMetadata,
  type RailMetadataEntry,
  type RailTransport,
} from '@keeta-agent-sdk/adapter-registry';
import type {
  PolicyComposition,
  PolicyAnchorBondHint,
  PolicyConfig,
  PolicyIdentityHints,
  PolicyKeetaHints,
  PolicyPack,
  PolicyPortfolioStats,
  PolicyRule,
  PolicyRuleMetadata,
} from '@keeta-agent-sdk/policy';
import {
  createKeetaWallet,
  type CreatedKeetaWallet,
  type KeetaWalletKeyAlgorithm,
} from '@keeta-agent-sdk/keeta';

export interface SdkClientOptions {
  baseUrl: string;
  fetchImpl?: typeof fetch;
  defaultHeaders?: HeadersInit;
}

export interface RequestOptions {
  signal?: AbortSignal;
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
  policyPackId?: string;
  configOverrides?: Partial<PolicyConfig>;
  contextOverrides?: PolicyEvaluationContextOverrides;
}

export interface PolicyEvaluateAppliedPack {
  id: string;
  name: string;
  source: PolicyPackSource;
}

export interface PolicyEvaluateResponse {
  decision: PolicyDecision;
  rules: PolicyRuleMetadata[];
  effectiveConfig: PolicyConfig;
  policyPack?: PolicyEvaluateAppliedPack | null;
  policyPackWarnings?: string[];
}

export interface CreatePolicyPackRequest {
  name: string;
  description?: string | null;
  rules?: PolicyRule[];
  compositions?: PolicyComposition[];
}

export interface UpdatePolicyPackRequest {
  name?: string;
  description?: string | null;
  rules?: PolicyRule[];
  compositions?: PolicyComposition[];
}

export type CreateIntentRequest = Omit<
  ExecutionIntent,
  'id' | 'createdAt' | 'effectivePolicyPackId' | 'effectivePolicyPackName' | 'effectivePolicyPackSource'
> & {
  requiresApproval?: boolean;
};

export interface IntentJobResult {
  jobId: string;
  queue: string;
  policyPackId?: string | null;
}

export interface PolicyIntentRequest {
  policyPackId?: string;
}

export interface RouteOverrideRequest {
  routePlanId: string;
}

export interface RouteOverrideResult {
  routePlanId: string;
}

export interface StrategyPolicyPackAssignment {
  strategyId: string;
  policyPackId: string | null;
}

export interface ListEventsFilter {
  after?: string;
  eventType?: string;
  intentId?: string;
  paymentAnchorId?: string;
  limit?: number;
}

export interface EventSubscriptionHandlers {
  onEvent?: (event: EventStreamEvent) => void;
  onError?: (error: Error) => void;
  onOpen?: (response: Response) => void;
}

export interface EventSubscription {
  close: () => void;
  done: Promise<void>;
}

export interface CreateWebhookRequest {
  targetUrl: string;
  eventTypes: string[];
  secret?: string;
  status?: 'active' | 'paused';
}

export type UpdateWebhookRequest = Partial<CreateWebhookRequest>;

export interface WalletSummary {
  id: string;
  label: string;
  address: string;
  createdAt: string;
  settings?: WalletSettings;
}

export interface CreateServerWalletRequest {
  label: string;
  index?: number;
  algorithm?: KeetaWalletKeyAlgorithm;
  includeSeed?: boolean;
  settings?: WalletSettings;
}

export interface CreatedServerWallet extends WalletSummary {
  derivation: {
    index: number;
    algorithm: KeetaWalletKeyAlgorithm;
  };
  seed?: string;
}

export type ImportOrCreateServerWalletRequest =
  | ({ mode: 'import' } & ImportWalletRequest)
  | ({ mode: 'create' } & CreateServerWalletRequest);

export type ImportOrCreateServerWalletResult =
  | { mode: 'import'; wallet: WalletSummary }
  | { mode: 'create'; wallet: CreatedServerWallet };

export interface ImportWalletRequest {
  label: string;
  address: string;
  settings?: WalletSettings;
}

export interface CreateWalletRequest {
  label?: string;
  register?: boolean;
  index?: number;
  algorithm?: KeetaWalletKeyAlgorithm;
  settings?: WalletSettings;
}

export interface CreateWalletResult {
  created: CreatedKeetaWallet;
  wallet?: WalletSummary;
}

export type CreateOrImportWalletRequest =
  | ({ mode: 'import' } & ImportWalletRequest)
  | ({ mode: 'create' } & CreateWalletRequest);

export type CreateOrImportWalletResult =
  | { mode: 'import'; wallet: WalletSummary }
  | ({ mode: 'create' } & CreateWalletResult);

async function parseJson<T>(res: Response | Promise<Response>): Promise<T> {
  const r = await res;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body}`);
  }
  return r.json() as Promise<T>;
}

async function expectSuccess(res: Response | Promise<Response>): Promise<void> {
  const r = await res;
  if (!r.ok) {
    const body = await r.text();
    throw new Error(`HTTP ${r.status}: ${body}`);
  }
}

function buildEventQuery(params: ListEventsFilter = {}): string {
  const query = new URLSearchParams();
  if (params.after) query.set('after', params.after);
  if (params.eventType) query.set('eventType', params.eventType);
  if (params.intentId) query.set('intentId', params.intentId);
  if (params.paymentAnchorId) query.set('paymentAnchorId', params.paymentAnchorId);
  if (typeof params.limit === 'number') query.set('limit', String(params.limit));
  return query.size > 0 ? `?${query.toString()}` : '';
}

async function consumeSseStream(
  response: Response,
  handlers: EventSubscriptionHandlers
): Promise<void> {
  if (!response.body) {
    throw new Error('Event stream response did not include a readable body');
  }

  const reader = response.body.getReader();
  const decoder = new TextDecoder();
  let buffer = '';
  let dataLines: string[] = [];

  const flushEvent = () => {
    if (dataLines.length === 0) return;
    const payload = dataLines.join('\n');
    dataLines = [];
    handlers.onEvent?.(JSON.parse(payload) as EventStreamEvent);
  };

  while (true) {
    const { done, value } = await reader.read();
    if (done) {
      break;
    }
    buffer += decoder.decode(value, { stream: true });

    let lineBreakIndex = buffer.indexOf('\n');
    while (lineBreakIndex >= 0) {
      let line = buffer.slice(0, lineBreakIndex);
      buffer = buffer.slice(lineBreakIndex + 1);
      if (line.endsWith('\r')) {
        line = line.slice(0, -1);
      }

      if (line === '') {
        flushEvent();
      } else if (!line.startsWith(':')) {
        const separator = line.indexOf(':');
        const field = separator >= 0 ? line.slice(0, separator) : line;
        let valueText = separator >= 0 ? line.slice(separator + 1) : '';
        if (valueText.startsWith(' ')) {
          valueText = valueText.slice(1);
        }
        if (field === 'data') {
          dataLines.push(valueText);
        }
      }

      lineBreakIndex = buffer.indexOf('\n');
    }
  }

  buffer += decoder.decode();
  if (buffer.length > 0) {
    let line = buffer;
    if (line.endsWith('\r')) {
      line = line.slice(0, -1);
    }
    if (line.startsWith('data:')) {
      dataLines.push(line.slice(5).trimStart());
    }
  }
  flushEvent();
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
  const getJson = <T>(path: string, options: RequestOptions = {}) =>
    parseJson<T>(request(path, { signal: options.signal }));
  const patchJson = <T>(path: string, body: unknown) =>
    parseJson<T>(
      request(path, {
        method: 'PATCH',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
  const putJson = <T>(path: string, body: unknown) =>
    parseJson<T>(
      request(path, {
        method: 'PUT',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(body),
      })
    );
  const postNoContent = (path: string, options: RequestOptions = {}) =>
    expectSuccess(
      request(path, {
        method: 'POST',
        signal: options.signal,
      })
    );
  const isRequestOptions = (value: unknown): value is RequestOptions =>
    !!value && typeof value === 'object' && 'signal' in (value as Record<string, unknown>) && !('policyPackId' in (value as Record<string, unknown>));
  const createServerWallet = (body: CreateServerWalletRequest) => postJson<CreatedServerWallet>('/wallets', body);
  const createOrImportServerWallet = (body: ImportOrCreateServerWalletRequest) =>
    postJson<ImportOrCreateServerWalletResult>('/wallets/import-or-create', body);
  const importWallet = (body: ImportWalletRequest) => postJson<WalletSummary>('/wallets/import', body);
  const createWallet = async (body: CreateWalletRequest = {}): Promise<CreateWalletResult> => {
    const created = createKeetaWallet({
      index: body.index,
      algorithm: body.algorithm,
    });
    const shouldRegister = body.register ?? Boolean(body.label);
    if (!shouldRegister) {
      return { created };
    }
    if (!body.label) {
      throw new Error('Wallet label is required when register is true');
    }
    const wallet = await importWallet({
      label: body.label,
      address: created.address,
      settings: body.settings,
    });
    return { created, wallet };
  };
  const createOrImportWallet = async (body: CreateOrImportWalletRequest): Promise<CreateOrImportWalletResult> => {
    if (body.mode === 'import') {
      const wallet = await importWallet({
        label: body.label,
        address: body.address,
        settings: body.settings,
      });
      return { mode: 'import', wallet };
    }

    const result = await createWallet({
      label: body.label,
      register: body.register,
      index: body.index,
      algorithm: body.algorithm,
      settings: body.settings,
    });
    return {
      mode: 'create',
      ...result,
    };
  };
  const subscribeEvents = (
    params: ListEventsFilter = {},
    handlers: EventSubscriptionHandlers = {},
    options: RequestOptions = {}
  ): EventSubscription => {
    const controller = new AbortController();
    const cleanupAbort = () => {
      if (options.signal) {
        options.signal.removeEventListener('abort', abortFromSignal);
      }
    };
    const abortFromSignal = () => controller.abort();
    if (options.signal) {
      if (options.signal.aborted) {
        controller.abort(options.signal.reason);
      } else {
        options.signal.addEventListener('abort', abortFromSignal, { once: true });
      }
    }

    const done = (async () => {
      try {
        const response = await request(`/events/stream${buildEventQuery(params)}`, {
          headers: { Accept: 'text/event-stream' },
          signal: controller.signal,
        });
        if (!response.ok) {
          const body = await response.text();
          throw new Error(`HTTP ${response.status}: ${body}`);
        }
        handlers.onOpen?.(response);
        await consumeSseStream(response, handlers);
      } catch (error) {
        if (!controller.signal.aborted) {
          const normalized = error instanceof Error ? error : new Error(String(error));
          handlers.onError?.(normalized);
          throw normalized;
        }
      } finally {
        cleanupAbort();
      }
    })();

    return {
      close: () => controller.abort(),
      done,
    };
  };

  return {
    health: () => getJson<{ ok: boolean }>('/health'),

    wallets: {
      list: () => getJson<WalletSummary[]>('/wallets'),
      createServer: createServerWallet,
      createOrImportServer: createOrImportServerWallet,
      import: importWallet,
      create: createWallet,
      createOrImport: createOrImportWallet,
    },

    listPolicyRules: () => getJson<{ rules: PolicyRuleMetadata[] }>('/policy/rules'),

    evaluatePolicy: (body: PolicyEvaluateRequest) =>
      postJson<PolicyEvaluateResponse>('/policy/evaluate', body),

    listPolicyPacks: (options: RequestOptions = {}) =>
      getJson<PolicyPack[]>('/policy/packs', options),

    createPolicyPack: (body: CreatePolicyPackRequest) =>
      postJson<PolicyPack>('/policy/packs', body),

    updatePolicyPack: (id: string, body: UpdatePolicyPackRequest) =>
      patchJson<PolicyPack>(`/policy/packs/${id}`, body),

    deletePolicyPack: (id: string, options: RequestOptions = {}) =>
      expectSuccess(
        request(`/policy/packs/${id}`, {
          method: 'DELETE',
          signal: options.signal,
        })
      ),

    listEvents: (params: ListEventsFilter = {}, options: RequestOptions = {}) =>
      getJson<{ events: EventStreamEvent[] }>(`/events${buildEventQuery(params)}`, options),

    subscribeEvents,

    streamEvents: subscribeEvents,

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

    listAdapters: (options: RequestOptions = {}) => getJson<AdapterSummary[]>('/adapters', options),

    listAvailableRails: async (options: RequestOptions = {}): Promise<AvailableRail[]> =>
      mergeRailMetadata(await getJson<AdapterSummary[]>('/adapters', options)),

    /**
     * Return the full rail catalog known to this SDK build (includes every rail the upstream
     * `@keetanetwork/anchor` currently advertises via `FiatPullRails` / `FiatPushRails` /
     * `CryptoRails`, not only those registered as active adapters in the local control plane).
     * Useful for dashboards and policy-pack authoring.
     */
    listRailCatalog: (): AvailableRail[] => listBuiltinRailMetadata(),

    /**
     * Filter the rail catalog by transport and/or production-only.
     */
    filterRailCatalog: (opts?: { transports?: RailTransport[]; productionOnly?: boolean }): RailMetadataEntry[] =>
      listBuiltinRailsByTransport(opts),

    createIntent: (body: CreateIntentRequest) =>
      postJson<ExecutionIntent>('/intents', body),

    getIntent: (id: string, options: RequestOptions = {}) =>
      getJson<ExecutionIntent>(`/intents/${id}`, options),

    quoteIntent: (id: string, options: RequestOptions = {}) =>
      parseJson<IntentJobResult>(
        request(`/intents/${id}/quote`, { method: 'POST', signal: options.signal })
      ),

    routeIntent: (id: string, options: RequestOptions = {}) =>
      parseJson<IntentJobResult>(
        request(`/intents/${id}/route`, { method: 'POST', signal: options.signal })
      ),

    policyIntent: (
      id: string,
      bodyOrOptions: PolicyIntentRequest | RequestOptions = {},
      options: RequestOptions = {}
    ) => {
      const body = isRequestOptions(bodyOrOptions) ? {} : bodyOrOptions;
      const requestOptions = isRequestOptions(bodyOrOptions) ? bodyOrOptions : options;
      return parseJson<IntentJobResult>(
        request(`/intents/${id}/policy`, {
          method: 'POST',
          signal: requestOptions.signal,
          ...(body.policyPackId
            ? {
                headers: { 'Content-Type': 'application/json' },
                body: JSON.stringify(body),
              }
            : {}),
        })
      );
    },

    executeIntent: (id: string, options: RequestOptions = {}) =>
      parseJson<IntentJobResult>(
        request(`/intents/${id}/execute`, { method: 'POST', signal: options.signal })
      ),

    approveIntent: (id: string, options: RequestOptions = {}) =>
      postNoContent(`/intents/${id}/approve`, options),

    holdIntent: (id: string, options: RequestOptions = {}) =>
      postNoContent(`/intents/${id}/hold`, options),

    releaseIntent: (id: string, options: RequestOptions = {}) =>
      postNoContent(`/intents/${id}/release`, options),

    registerRouteOverride: (id: string, body: RouteOverrideRequest) =>
      postJson<RouteOverrideResult>(`/intents/${id}/override-route`, body),

    runSimulation: (body: { intentId: string; routePlanId: string }) =>
      postJson<IntentJobResult>('/simulations/run', body),

    getSimulation: (id: string, options: RequestOptions = {}) =>
      getJson<SimulationResult>(`/simulations/${id}`, options),

    getWalletBalances: (id: string, options: RequestOptions = {}) =>
      getJson<WalletBalancesResponse>(`/wallets/${id}/balances`, options),

    getChainHealth: (options: RequestOptions = {}) =>
      getJson<ChainHealthResponse>('/chain/health', options),

    getConfigModes: (options: RequestOptions = {}) =>
      getJson<ConfigModes>('/config/modes', options),

    getStrategyTemplates: (options: RequestOptions = {}) =>
      getJson<StrategyTemplate[]>('/strategy-templates', options),

    getOpsMetrics: (options: RequestOptions = {}) =>
      getJson<{ samples: OpsMetricSample[] }>('/ops/metrics', options),

    getStrategyPolicyPack: (id: string, options: RequestOptions = {}) =>
      getJson<StrategyPolicyPackAssignment>(`/ops/strategies/${id}/policy-pack`, options),

    setStrategyPolicyPack: (id: string, policyPackId: string) =>
      putJson<StrategyPolicyPackAssignment>(`/ops/strategies/${id}/policy-pack`, { policyPackId }),

    clearStrategyPolicyPack: (id: string, options: RequestOptions = {}) =>
      parseJson<StrategyPolicyPackAssignment>(
        request(`/ops/strategies/${id}/policy-pack`, {
          method: 'DELETE',
          signal: options.signal,
        })
      ),

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
