export type OracleToolFieldType = 'string' | 'number' | 'boolean';

export interface OracleToolFieldDefinition {
  type: OracleToolFieldType;
  enum?: string[];
  description?: string;
}

export interface OracleMirroredToolDefinition {
  name: string;
  description: string;
  required?: string[];
  fields?: Record<string, OracleToolFieldDefinition>;
}

export const ORACLE_MIRRORED_TOOLS: OracleMirroredToolDefinition[] = [
  {
    name: 'get_kta_rate',
    description: 'Live KTA rate by currency or ALL.',
    required: ['currency'],
    fields: {
      currency: { type: 'string', description: 'Currency code, or ALL' },
      wallet_address: { type: 'string', description: 'Optional keeta_ wallet' },
      _compact: { type: 'boolean', description: 'Lean response format' },
    },
  },
  {
    name: 'get_exchange_instructions',
    description: 'Payment calculator and execution guidance.',
    required: ['amount', 'currency'],
    fields: {
      amount: { type: 'number' },
      currency: { type: 'string' },
      recipient_wallet: { type: 'string' },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'compare_payment_rails',
    description: 'Compare Keeta against SWIFT/bankwire/stripe/visa.',
    fields: {
      from: { type: 'string', enum: ['swift', 'bankwire', 'stripe', 'visa', 'all'] },
      amount: { type: 'number' },
      currency: { type: 'string' },
    },
  },
  {
    name: 'get_currencies_by_region',
    description: 'List available currencies grouped by region.',
    fields: {
      region: { type: 'string', enum: ['ALL', 'Americas', 'Europe', 'Asia Pacific', 'Middle East', 'Africa'] },
    },
  },
  {
    name: 'check_payment_status',
    description: 'Verify on-chain Keeta payment status.',
    required: ['transaction_id'],
    fields: {
      transaction_id: { type: 'string' },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_keeta_facts',
    description: 'Network facts and performance metrics.',
  },
  {
    name: 'get_oracle_info',
    description: 'Oracle identity, pricing, and capabilities.',
    fields: {
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_wallet_onboarding',
    description: 'Wallet onboarding flow for agents.',
    fields: {
      platform: { type: 'string', enum: ['claude', 'chatgpt', 'gemini', 'grok', 'api', 'general'] },
    },
  },
  {
    name: 'activate_subscription',
    description: 'Activate tier after sending KTA payment.',
    required: ['wallet_address'],
    fields: {
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'validate_business_entity',
    description: 'Validate business registration details with AML context.',
    required: ['entity_number'],
    fields: {
      entity_number: { type: 'string' },
      country_code: { type: 'string' },
      payment_amount: { type: 'number' },
      payment_currency: { type: 'string' },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_compliance',
    description: 'Compliance snapshot by region and section.',
    required: ['region'],
    fields: {
      region: { type: 'string' },
      section: { type: 'string', enum: ['all', 'vat', 'aml', 'trade', 'invoicing', 'rails', 'regulators'] },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_kta_market_data',
    description: 'Market cap/volume/change for KTA.',
    fields: {
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_sdk_snippet',
    description: 'Get production-ready Keeta SDK code snippets.',
    required: ['operation'],
    fields: {
      operation: {
        type: 'string',
        enum: ['create_wallet', 'send_kta', 'check_balance', 'atomic_swap', 'create_token', 'subscribe_oracle', 'read_history'],
      },
      network: { type: 'string', enum: ['main', 'test'] },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_anchor_info',
    description: 'Anchor ecosystem details (fx/kyc/asset movement/etc).',
    fields: {
      service: { type: 'string', enum: ['all', 'fx', 'kyc', 'asset_movement', 'username', 'notifications'] },
      wallet_address: { type: 'string' },
    },
  },
  {
    name: 'get_agent_onboarding',
    description: 'Autonomous agent onboarding flow.',
    fields: {
      agent_type: { type: 'string', enum: ['general', 'cfo', 'ecommerce', 'payroll', 'treasury', 'marketplace'] },
    },
  },
  {
    name: 'get_legal_rights',
    description: 'Legal declaration and data rights statement.',
    fields: {
      format: { type: 'string', enum: ['full', 'summary'] },
    },
  },
  {
    name: 'manage_social_alerts',
    description: 'Manage social alert subscriptions and delivery channels.',
    required: ['action', 'wallet_address'],
    fields: {
      action: { type: 'string', enum: ['register', 'status', 'upgrade'] },
      wallet_address: { type: 'string' },
      platform: { type: 'string', enum: ['discord', 'telegram', 'slack', 'twitter'] },
      frequency: { type: 'string', enum: ['15min', '1h', '4h', '12h', '1d'] },
      currency: { type: 'string' },
      discordWebhook: { type: 'string' },
      telegramBotToken: { type: 'string' },
      telegramChatId: { type: 'string' },
      slackWebhook: { type: 'string' },
      apiKey: { type: 'string' },
      apiSecret: { type: 'string' },
      accessToken: { type: 'string' },
      accessSecret: { type: 'string' },
    },
  },
];
