export { KeetaClient } from './client.js';
export { AccountManager, type KeetaAccount } from './account.js';
export { getBalances, type BalanceEntry } from './balances.js';
export { readChainHealth, readNetworkInfo, type ChainHealthSnapshot } from './chain-reader.js';
export { KeetaConnectionError, isKeetaErrorRetryable } from './errors.js';
export {
  KtaOracleClient,
  KtaOracleRequestError,
  type KtaOracleClientOptions,
  type KtaOracleMcpTool,
  type OracleRateParams,
  type OracleCompareParams,
} from './oracle-client.js';
export {
  normalizeOracleToolResult,
  callOracleTool,
  buildOraclePaymentPlaybook,
  asOracleToolCaller,
  type OracleToolCaller,
  type OracleToolEnvelope,
  type OracleCompareFrom,
  type OraclePaymentPlaybookInput,
  type OraclePaymentPlaybook,
} from './oracle-playbook.js';
export {
  buildTransferTx,
  submitTx,
  signAndSubmit,
  sendTransferWithUserClient,
  sendTransferWithUserClientWithRetry,
  receiptFromPublishResult,
  inferSettlementState,
  type UnsignedTransfer,
  type KeetaPublishReceipt,
  type SettlementState,
} from './transactions.js';
export { signPayload } from './signer-bridge.js';
export { createReadOnlyUserClient, createSigningUserClient } from './worker-bridge.js';
export {
  createKeetaWallet,
  type CreateKeetaWalletOptions,
  type CreatedKeetaWallet,
  type KeetaWalletKeyAlgorithm,
} from './wallet.js';
export {
  createAnchorBondVerifier,
  type AnchorBondInspectionResult,
  type AnchorBondVerificationInput,
  type AnchorBondVerificationResult,
  type AnchorBondVerifier,
} from './anchor-bonds.js';

/** Worker injects this key into `ExecuteContext.extensions` (value: UserClient from SDK). */
export const KEETA_USER_CLIENT_EXTENSION = 'keetaUserClient' as const;

export type { UserClient } from '@keetanetwork/keetanet-client';
export type { KeetaNetworkName } from './network-types.js';
