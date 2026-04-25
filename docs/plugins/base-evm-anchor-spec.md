# Keeta Agent Stack — Base EVM Anchor Plugin Spec (v3.2)

**Target repo:** `IAMKMFA/keeta-agent-stack` **Plugin name:**
`@keeta-agent-stack/plugin-base-evm-anchor` **Status:** optional add-on. Core stack runs without it.
**License:** Apache-2.0 **Supersedes:** v3.1. v3.2 integrates critical corrections from the pre-code
review: corrects KTA tax math to percent-based, fixes the normalized receipt extension plan, scopes
dependency pinning, locks `VenueKind` to existing values, makes the worker signer registry an
explicit approved core change, adds quote/tax freshness, and tightens Aerodrome fee-on-transfer
handling.

**Changes from v3.1 at a glance:**

- **Tax is PERCENT, not basis points.** The contract's `getCurrentTax()` returns `uint8` (0–100) and
  divides by 100. All adapter code reads percent and converts to bps for display/policy.
- **Receipt schema approach reversed.** Core `NormalizedReceipt` has a closed `railKind` enum and no
  `raw` field. EVM receipts map to `railKind: 'other'` + plugin-local extended Drizzle tables.
- `plugins/*` added to `pnpm-workspace.yaml`, Base env vars added to `turbo.json` `globalEnv`.
- Dependency pinning rule scoped to new plugin packages only.
- `VenueKind` stays `dex | anchor | transfer`. Adapters use existing kinds.
- Worker signer registry is an explicit approved core change, not conditional.
- New: quote + tax freshness fields, log-match-by-recipient, `approve()` zero-first rule,
  fee-on-transfer-safe swaps.
- New Section 0.1: critical corrections summary.

---

## 0. Read-Me-First Rules for Cursor

1. **Inventory before invention.** Phase 0 is mandatory. Quote real types from real files including
   `apps/dashboard` and `apps/worker`.
2. **Do not modify existing packages or apps** unless explicitly listed in Phase 5, 5.7, or the
   approved core changes enumerated in Section 0.1. If any other core change seems needed, STOP and
   surface.
3. **Verify every address against an official source.** KTA ERC-20:
   `0xc0634090F2Fe6c6d75e61Be2b949464aBB498973` (verified on BaseScan). Pin sources + verification
   dates in `constants.ts`.
4. **KTA transfer tax is a PERCENTAGE, not basis points.** The contract's `getCurrentTax()` returns
   `uint8` with value 0–100 representing percent. Tax is computed as `amount * tax / 100`. Always
   read as percent, validate `0 <= n <= 100 && Number.isInteger(n)`, and convert to bps only for
   display and policy comparisons. See Section 11 for the math. Treating the return value as bps
   understates tax by 100×.
5. **Signing terminates in `apps/worker` only.** No private keys in adapters, MCP, or dashboard.
6. **Pin every NEW plugin package dependency exactly.** Do not rewrite existing repo dependency
   ranges — the root `package.json` uses caret ranges today and that is out of scope.
7. **Every public function: Zod schema + TypeDoc comment.**
8. **Respect `KeetaNetwork/anchor`** as authority on anchor semantics.
9. **Asset IDs are chain-aware** (`KTA_BASE` ≠ `KTA_NATIVE`).
10. **MCP never signs.** This plugin contributes zero MCP tools classified as `signing`. Existing
    core signing-classified MCP tools (e.g. `keeta_*_execute`) are out of scope.
11. **Dashboard components are opt-in and feature-flagged.** With plugin uninstalled, core dashboard
    is byte-identical to pre-plugin baseline.
12. **No mock data in the dashboard.** Real APIs, real loading/empty/error states.
13. **Adapter `kind` values are limited to `'transfer' | 'dex' | 'anchor'`** — the existing closed
    enum. Do not invent new venue kinds. Express EVM-ness via `id` and capability features.
14. STOP if any acceptance criterion (Section 22) can't be met without violating the above.

---

## 0.1 Critical Corrections from Phase-0 Precheck

Before Phase 0 kicks off, these facts about the real repo are confirmed and non-negotiable. Cursor
must not contradict them.

- **`getCurrentTax()` returns a percentage (0–100), not bps.** Tax math is `amount * tax / 100`. All
  adapter code reads percent; `transferTaxBps` is a _derived_ field (`percent * 100`).
- **`NormalizedReceiptSchema`** currently has
  `railKind ∈ { native_kt, cctp_usdc, fiat, swift, other }` and
  `settlementState ∈ { submitted, confirmed, failed, unknown }`. No `raw` or `extensions` field.
  Until a core schema change is approved, EVM receipt details live in plugin-local schemas
  (`EvmReceiptExtensionSchema`) stored in plugin Drizzle tables, and normalized receipts use
  `railKind: 'other'`, `network: 'base'`, and existing fields like `txHash` and `blockHash`.
- **`VenueKindSchema`** is `'dex' | 'anchor' | 'transfer'`. No EVM-specific kinds. Adapter IDs and
  capability features carry EVM context.
- **`pnpm-workspace.yaml`** currently lists `apps/*`, `packages/*`, `examples/*`. Phase 1 adds
  `plugins/*`. `turbo.json` currently curates `globalEnv`; Base-related env vars get appended there
  if any pipeline task reads them.
- **Plugin dependency pinning is exact for new packages only.** Existing repo dependency ranges are
  not rewritten.
- **This plugin contributes zero MCP `signing` tools.** Existing core signing-classified MCP tools
  are out of scope for this plugin's work.
- **`apps/worker` has no `signers/` directory today.** The signer registry is an approved core
  change in Phase 3. Phase 0 still verifies the exact shape of the current `run.ts` execution path,
  but the outcome is not conditional: we are adding a signer registry.
- **Base public RPC is rate-limited and is not acceptable for production.** Plugin refuses to start
  in `NODE_ENV=production` with a public-RPC URL.

---

## 1. What This Plugin Does (User-Facing)

Adds Base EVM as a first-class rail with chain-aware assets (`KTA_BASE`), tax-aware transfers,
EIP-2612 permits, Aerodrome DEX access with fee-on-transfer-safe swaps, anchor lifecycle tracking,
and full dashboard visibility.

Tax is reconciled end-to-end: read at quote time, re-read at simulation, verified at execution,
matched against actual `Transfer` logs in receipts. Operators see amount sent vs amount delivered in
every receipt view.

## 2. What This Plugin Has Access To

| Resource                   | Access                         | How                                                                 |
| -------------------------- | ------------------------------ | ------------------------------------------------------------------- |
| Base JSON-RPC (reads)      | Required                       | Alchemy / Coinbase Node / private RPC. Public RPC rejected in prod. |
| Base JSON-RPC (writes)     | Required when `mode='live'`    | AWS KMS signer in worker                                            |
| KTA ERC-20 contract        | Read + write via worker        | `viem`                                                              |
| Aerodrome Router + Factory | Read + write via worker        | Pinned ABI, fee-on-transfer-safe entry points for KTA legs          |
| AWS KMS                    | Sign only                      | `@aws-sdk/client-kms`, worker only                                  |
| Keeta explorer APIs        | Read-only                      | `explorer.keeta.com`, `keescan.org`, `kee.tools`, BaseScan          |
| Keeta anchor library       | Compose                        | `github.com/KeetaNetwork/anchor`                                    |
| Policy engine              | Register rules                 | Existing `packages/policy` extension                                |
| MCP surface                | Read + intent-creation only    | `evm.*`, `anchor.base.*`                                            |
| Dashboard API              | Read-only                      | `/api/plugins/base-evm-anchor/*`                                    |
| Dashboard UI               | Register feature-flagged views | Via `apps/dashboard` plugin extension point                         |
| User seeds / Keeta L1 keys | **No access**                  | Workspace import-lint enforces                                      |

## 3. What This Plugin Does NOT Do

From v3.1, plus:

- **Never assumes zero tax.** If `getCurrentTax()` read fails and `BLOCK_ON_UNKNOWN_TAX=true`,
  adapter refuses to quote.
- **Never uses the first `Transfer` log blindly.** Delivered amount comes from the `Transfer` event
  where `to == intendedRecipient`.
- **Never overwrites a non-zero ERC-20 allowance.** Either permit-first (preferred) or
  zero-before-nonzero approve.
- **No new `VenueKind` values.** No `evm` kind, no `evm_erc20` kind in adapter definitions.

## 4. Opt-In Model

```ts
import { AdapterRegistry } from '@keeta-agent-stack/adapter-registry';
import { registerBaseEvmAnchorPlugin } from '@keeta-agent-stack/plugin-base-evm-anchor';

const registry = new AdapterRegistry();

registerBaseEvmAnchorPlugin(registry, {
  rpcUrl: process.env.BASE_RPC_URL!,
  rpcFallbackUrls: [process.env.BASE_RPC_FALLBACK_URL!],
  chainId: 8453,
  aerodrome: {
    enabled: true,
    useFeeOnTransferSafeSwaps: true, // default true for any KTA leg
  },
  signer: {
    backend: 'aws-kms',
    kmsKeyId: process.env.BASE_KMS_KEY_ID!,
    awsRegion: process.env.AWS_REGION ?? 'us-east-1',
  },
  anchor: {
    officialLibrary: true,
    explorerBaseUrls: {
      /* … */
    },
  },
  dashboard: {
    enabled: process.env.DASHBOARD_BASE_EVM_ENABLED === 'true',
  },
  freshness: {
    maxQuoteAgeSeconds: 30,
    maxBlockDriftBetweenQuoteAndExecute: 5,
    reverifyTaxOnExecute: true,
  },
});
```

---

## 5. Phase 0 — INVENTORY

### 5.1 Pre-confirmed facts (Section 0.1)

All items in Section 0.1 are treated as confirmed. Cursor still quotes the real files to verify
exact signatures but does not re-debate these findings.

### 5.2 Files Cursor must read and quote

1. `packages/adapter-base/src/venue-adapter.ts` — real `VenueAdapter` interface. Quote `id`, `kind`,
   `healthCheck`, `getCapabilities`, `supportsPair`, `getQuote`, `execute` signatures.
2. `packages/adapter-mock-dex/**` — template for `adapter-aerodrome`
3. `packages/adapter-keeta-transfer/src/transfer-adapter.ts` — template for `adapter-base-evm`;
   confirm same-asset-only behavior
4. `packages/adapter-mock-anchor/**` (if present) — template for `adapter-base-evm-anchor`
5. `packages/keeta/**` — anchor/bond helpers, official library integration
6. `packages/types/src/schemas/normalized-receipt.ts` — real shape, real enums
7. `packages/types/src/schemas/common.ts` — `AssetIdSchema`, `VenueKindSchema`
8. `packages/policy/**` — rule registration
9. `packages/simulator/**` — mode/module registration
10. `apps/worker/src/index.ts`, `run.ts`, `operator-metrics-cache.ts` — map the real execution path
    so Phase 3's signer-registry refactor targets the right seams
11. `apps/mcp/src/tools/**` and `apps/mcp/TOOLS.md` — tool classification conventions
12. `packages/storage/**` — Drizzle schema; identify where plugin-local tables live
13. `docs/creating-new-adapter.md`
14. `SECURITY.md`
15. `apps/dashboard/**` — framework, component library, charting, data-fetching, plugin extension
    mechanism. This single inventory determines whether Phase 5.7 is additive or requires a scoped
    core change.
16. `apps/api/src/routes/**` — API convention (REST / tRPC / other)
17. `packages/telemetry/**`
18. `pnpm-workspace.yaml`, `turbo.json`, root `package.json` — current workspace shape

### 5.3 Upstream sources

19. `github.com/KeetaNetwork/anchor` — npm availability, exports, semantics
20. `docs.keeta.com/features/anchors` and `/creating-an-anchor`
21. `static.test.keeta.com/docs`

### 5.4 On-chain verification

22. `basescan.org/token/0xc0634090F2Fe6c6d75e61Be2b949464aBB498973` — re-confirm:
    - `getCurrentTax()` returns `uint8`, 0–100 percent (this is the pre-confirmed fact from Section
      0.1; verify once more directly)
    - Transfer update code uses `amount * tax / 100`
    - `approve()` requires previous allowance to be zero or new allowance to be zero
    - `ERC20Permit` (EIP-2612) is present
23. BaseScan deep-link URL patterns
24. Aerodrome Router source (`github.com/aerodrome-finance/contracts`) — confirm
    fee-on-transfer-safe swap entry points: `swapExactTokensForTokensSupportingFeeOnTransferTokens`
    and related. Pin names and signatures.

### 5.5 Deliverable

Written report. Must explicitly answer:

- Real signatures for every interface in 5.2 items 1–7
- Dashboard plugin extension mechanism — present or needs scoped core change?
- Worker execution path — where does the signer registry plug in?
- Confirmed tax return unit (percent, 0–100)
- Confirmed Aerodrome fee-on-transfer-safe function names
- Any contradictions with spec assumptions

---

## 6. Package Layout

```
packages/
  evm/                           # shared EVM primitives
    src/
      index.ts
      client.ts                  # viem clients
      chains.ts
      types.ts                   # UnsignedEvmTx, EvmAddress, BaseChainId, EvmQuoteExtension
      gas.ts
      errors.ts
    test/
    README.md

  adapter-base-evm/              # ERC-20 KTA transfer rail
    src/
      index.ts
      adapter.ts                 # BaseEvmTransferAdapter (kind: 'transfer')
      constants.ts               # KTA, WETH, USDC — pinned + cited
      permit.ts                  # EIP-2612 payload builder (unsigned)
      approve.ts                 # zero-first approve helper
      tax.ts                     # percent reader + bps converter + delivered math
      logs.ts                    # Transfer-log matcher by recipient
      types.ts
      errors.ts
    test/
    README.md

  adapter-aerodrome/             # DEX adapter
    src/
      index.ts
      adapter.ts                 # AerodromeAdapter (kind: 'dex')
      router.ts                  # Router ABI, fee-on-transfer-safe variants pinned
      pools.ts
      constants.ts
      types.ts
      errors.ts
    test/
    README.md

  adapter-base-evm-anchor/       # Anchor lifecycle (kind: 'anchor')
    src/
      index.ts
      adapter.ts
      events.ts
      state.ts
      explorers.ts
      types.ts
      errors.ts
    test/
    README.md

  simulator-evm/
  assets-base/
  dashboard-base-evm/            # from v3.1, unchanged in layout

plugins/
  base-evm-anchor/
    src/
      index.ts                   # registerBaseEvmAnchorPlugin
      config.ts
    README.md
    CHANGELOG.md

examples/
  base-evm-readonly/             # Phase 1 — no signing
  base-evm-anchor-swap/          # Phase 5+
```

**Workspace wiring (required in Phase 1):**

- `pnpm-workspace.yaml`: append `plugins/*`
- `turbo.json` `globalEnv`: append `BASE_RPC_URL`, `BASE_RPC_FALLBACK_URL`, `BASE_CHAIN_ID`,
  `BASE_KMS_KEY_ID`, `AWS_REGION`, `BASE_SIGNING_PRIVATE_KEY`, `MCP_ALLOW_INLINE_EVM_KEYS`,
  `AERODROME_ROUTER_ADDRESS`, `AERODROME_FACTORY_ADDRESS`, `DASHBOARD_BASE_EVM_ENABLED`, plus others
  from Section 17 as they affect build/test outputs

---

## 7. Asset Registry

Unchanged from v3.1 Section 7. `packages/assets-base` defines `KTA_NATIVE`, `KTA_BASE`, `USDC_BASE`,
`WETH_BASE` with `hasTransferTax: true` on `KTA_BASE`.

---

## 8. Zod Schemas

### 8.1 Shared EVM primitives — `packages/evm/src/types.ts`

```ts
import { z } from 'zod';

export const BaseChainIdSchema = z.union([z.literal(8453), z.literal(84532)]);
export const EvmAddressSchema = z.string().regex(/^0x[a-fA-F0-9]{40}$/);

export const UnsignedEvmTxSchema = z.object({
  chainId: BaseChainIdSchema,
  to: EvmAddressSchema,
  data: z.string().regex(/^0x[a-fA-F0-9]*$/),
  value: z.string().regex(/^\d+$/).default('0'),
  gasLimit: z.string().regex(/^\d+$/).optional(),
  maxFeePerGas: z.string().regex(/^\d+$/).optional(),
  maxPriorityFeePerGas: z.string().regex(/^\d+$/).optional(),
  intentId: z.string().uuid(),
  source: z.object({
    adapter: z.string(),
    version: z.string(),
    purpose: z.enum([
      'transfer',
      'swap',
      'approve',
      'approve-zero',
      'permit-relay',
      'anchor-lock',
      'anchor-release',
    ]),
  }),
});
```

### 8.2 EVM quote extension (with freshness) — `packages/evm/src/types.ts`

```ts
/** Extension fields every EVM-rail QuoteResponse includes. */
export const EvmQuoteExtensionSchema = z.object({
  // Gas accounting
  feeAsset: z.literal('ETH'),
  feeAmountWei: z.string().regex(/^\d+$/),
  feeAmountEthHuman: z.string(),
  feeAmountUsdEstimate: z.string().optional(),
  gasLimit: z.string().regex(/^\d+$/),
  maxFeePerGas: z.string().regex(/^\d+$/),
  maxPriorityFeePerGas: z.string().regex(/^\d+$/),

  // Tax-aware delivery (percent-sourced, bps-derived)
  transferTaxPercent: z.number().int().min(0).max(100), // raw from contract
  transferTaxBps: z.number().int().min(0).max(10_000), // derived = percent * 100
  expectedInputAmount: z.string().regex(/^\d+$/),
  expectedRecipientAmount: z.string().regex(/^\d+$/), // input minus tax
  expectedTaxAmount: z.string().regex(/^\d+$/),

  // Freshness (new in v3.2)
  quoteBlockNumber: z.number().int().nonnegative(),
  taxCheckedBlockNumber: z.number().int().nonnegative(),
  quoteTimestampMs: z.number().int().positive(),
  quoteExpiresAtMs: z.number().int().positive(),
  maxQuoteAgeSeconds: z.number().int().positive(),
  maxBlockDriftBetweenQuoteAndExecute: z.number().int().nonnegative(),
});
```

Where to store: if Phase 0 finds a core `extensions` slot on `QuoteResponse`, use it. If not, store
in a plugin-scoped wrapper (`EvmQuotedResponse = { core: QuoteResponse, evm: EvmQuoteExtension }`)
and do NOT invent a `raw.evm` path that the core schema doesn't support.

### 8.3 EIP-2612 permit

Unchanged from v3.

### 8.4 Anchor state

Unchanged from v3.

---

## 9. EVM Receipt Extension — Plugin-Local

**Corrected from v3.1.** `NormalizedReceipt` has a closed `railKind` enum and no `raw` field today.

### 9.1 Mapping to core

For every Base EVM execution, plugin emits a `NormalizedReceipt` using existing fields only:

- `railKind: 'other'`
- `network: 'base'`
- `txHash`, `blockHash`: the real Base values
- `settlementState`: one of the existing values (`submitted | confirmed | failed | unknown`). A
  Base-side under-delivered tx is mapped to `confirmed` on-chain but emits a separate
  `settlement.under_delivered` event.

### 9.2 Extended EVM receipt (plugin-local schema)

Stored in a new Drizzle table `plugin_base_evm_receipts` with a foreign key to the core receipt's
intent id.

```ts
export const EvmReceiptExtensionSchema = z.object({
  intentId: z.string().uuid(), // FK to core
  normalizedReceiptRef: z.string(), // whatever the core key is
  chainId: BaseChainIdSchema,
  tokenAddress: EvmAddressSchema,
  txHash: z.string().regex(/^0x[a-fA-F0-9]{64}$/),
  blockNumber: z.number().int().nonnegative(),
  from: EvmAddressSchema,
  to: EvmAddressSchema,
  amountRaw: z.string().regex(/^\d+$/), // what was sent
  amountHuman: z.string(),
  amountDeliveredRaw: z.string().regex(/^\d+$/), // from Transfer log WHERE to == recipient
  amountDeliveredHuman: z.string(),
  transferTaxPercent: z.number().int().min(0).max(100), // tax at execution time
  transferTaxBps: z.number().int().min(0).max(10_000),
  taxAmountRaw: z.string().regex(/^\d+$/),
  gasUsed: z.string().regex(/^\d+$/),
  effectiveGasPrice: z.string().regex(/^\d+$/),
  gasCostWei: z.string().regex(/^\d+$/),
  logs: z.array(z.unknown()),
  underDelivered: z.boolean(), // amountDelivered < minReceived
});
```

### 9.3 Tracked core change (separate, not in this plugin)

Open an issue: "Promote EVM receipt fields to `NormalizedReceipt` first-class schema extension."
Include the proposed fields. The plugin's dashboard reads plugin-local tables today; if/when the
core schema change lands, the dashboard swaps its data source with no UI change.

---

## 10. Adapter Contracts

All three adapters use existing `VenueKind` values.

### 10.1 `BaseEvmTransferAdapter` — `kind: 'transfer'`

- `id: 'base-kta-transfer'`
- `supportsPair(a, b)`: true only for `('KTA_BASE', 'KTA_BASE')`
- `getCapabilities()`: features
  `['evm', 'base', 'erc20-transfer', 'balance-read', 'gas-estimate', 'tax-aware', 'permit']`
- `getQuote(req)`: reads tax percent, captures block number, returns core quote +
  `EvmQuoteExtension` (Section 8.2)
- `execute(ctx)`:
  - Simulate: `eth_call` + `estimateGas`
  - Live: re-reads tax at execute-block, rejects if tax changed or quote expired (Section 11.4),
    then builds `UnsignedEvmTx` for worker signing
- `readBalance`, `readAllowance`, `readPermitNonce`
- `buildPermitPayload`: unsigned EIP-2612 payload
- `buildApprove`: if used, enforces zero-first pattern (Section 10.4)

Never signs.

### 10.2 `AerodromeAdapter` — `kind: 'dex'`

- `id: 'aerodrome-base'`
- `getQuote(req)`: `Router.getAmountsOut` with correct `Route[]`, includes `EvmQuoteExtension`. For
  KTA legs, the quote accounts for tax on entry AND exit if both are KTA sides.
- `buildTx(req)`: **for any KTA leg, uses the fee-on-transfer-safe function variant**
  (`swapExactTokensForTokensSupportingFeeOnTransferTokens` or Aerodrome's equivalent — pin the exact
  name from Phase 0 item 24). Non-KTA routes may use the standard variant.
- Post-execution: always reconcile recipient balance delta against `minReceivedAmount`.
- Typed errors: `INSUFFICIENT_LIQUIDITY`, `NO_POOL`, `SLIPPAGE_EXCEEDED`, `PRICE_IMPACT_EXCEEDED`,
  `FEE_ON_TRANSFER_MISMATCH`, `RPC_FAILURE`.

Phase 4 quote-only. Live execution behind Phase 5.

### 10.3 `BaseEvmAnchorAdapter` — `kind: 'anchor'`

Unchanged from v3.1. Wraps `KeetaNetwork/anchor`. Reads state, watches events, builds lock/release
unsigned txs, emits drift events.

### 10.4 Approve handling (critical)

The KTA contract requires previous allowance = 0 OR new allowance = 0. Plugin rules:

1. **Prefer permit.** If `usePermit: true` and contract supports it (KTA does), always permit.
2. **If raw approve is required**, enforce the zero-first sequence:
   - Read `allowance(owner, spender)`
   - If zero, submit one approve tx for the desired amount
   - If non-zero, submit approve(0) first, wait for confirmation, then submit approve(desired)
3. Both txs get `source.purpose: 'approve-zero'` and `'approve'` respectively for audit clarity.

Policy default: `requirePermitOverApprove: true` (Section 13). Raw approve is gated behind a flag +
dev-only warning.

---

## 11. Token Transfer Tax — Percent-Based Math

**CORRECTED in v3.2.** Prior versions had bps math in example code. The contract source on BaseScan
shows tax is `uint8` percent (0–100) and tax amount is `amount * tax / 100`.

### 11.1 Reader

File: `packages/adapter-base-evm/src/tax.ts`

```ts
import type { PublicClient } from 'viem';

const KTA_ABI_TAX = [
  {
    type: 'function',
    name: 'getCurrentTax',
    stateMutability: 'view',
    inputs: [],
    outputs: [{ type: 'uint8' }],
  },
] as const;

export async function readCurrentTaxPercent(
  client: PublicClient,
  tokenAddress: `0x${string}`,
  blockNumber?: bigint
): Promise<{ taxPercent: number; atBlock: number }> {
  const block = blockNumber ?? (await client.getBlockNumber());
  let taxRaw: number | bigint;
  try {
    taxRaw = await client.readContract({
      address: tokenAddress,
      abi: KTA_ABI_TAX,
      functionName: 'getCurrentTax',
      blockNumber: block,
    });
  } catch (err) {
    throw new UnknownTransferTaxError(tokenAddress, err);
  }

  const taxPercent = Number(taxRaw);
  if (!Number.isInteger(taxPercent) || taxPercent < 0 || taxPercent > 100) {
    throw new InvalidTransferTaxError(tokenAddress, taxPercent);
  }
  return { taxPercent, atBlock: Number(block) };
}

export function taxPercentToBps(taxPercent: number): number {
  return taxPercent * 100;
}

export function computeExpectedDelivered(
  amountInRaw: bigint,
  taxPercent: number
): { deliveredRaw: bigint; taxAmountRaw: bigint; taxBps: number } {
  // Mirrors the contract's math: amount * tax / 100
  const taxAmountRaw = (amountInRaw * BigInt(taxPercent)) / 100n;
  return {
    deliveredRaw: amountInRaw - taxAmountRaw,
    taxAmountRaw,
    taxBps: taxPercentToBps(taxPercent),
  };
}
```

### 11.2 Rules

- Every quote calls `readCurrentTaxPercent` and records `taxPercent`, `taxBps`,
  `taxCheckedBlockNumber` in `EvmQuoteExtension`.
- Every simulation re-reads tax at simulation block.
- Every live execution **re-reads tax at the block immediately before building the tx**. If tax has
  changed since quote AND `reverifyTaxOnExecute: true`, the adapter rejects with
  `TaxChangedSinceQuote` unless the operator explicitly accepts.
- Every receipt records `transferTaxPercent` AND `transferTaxBps` AND `amountDeliveredRaw`.
- Fail-closed: if `readCurrentTaxPercent` throws AND `BLOCK_ON_UNKNOWN_TAX=true` (default), adapter
  refuses to quote.

### 11.3 Delivered-amount parsing (Section 11.3)

File: `packages/adapter-base-evm/src/logs.ts`

The KTA contract's taxed transfer emits **multiple `Transfer` events** — one to the tax recipient,
one to the final recipient. Blind first-log parsing is wrong.

```ts
export function findTransferToRecipient(
  logs: readonly Log[],
  tokenAddress: `0x${string}`,
  expectedRecipient: `0x${string}`
): { amountRaw: bigint } | null {
  const transfers = logs
    .filter((l) => l.address.toLowerCase() === tokenAddress.toLowerCase())
    .map((l) => decodeTransferEvent(l))
    .filter((t): t is DecodedTransfer => t !== null);

  // Match on recipient address (normalized lowercase)
  const match = transfers.find((t) => t.to.toLowerCase() === expectedRecipient.toLowerCase());
  return match ? { amountRaw: match.value } : null;
}
```

Tests MUST cover:

- Single-transfer (tax = 0) case
- Split-transfer (tax > 0) case with the tax going to the contract itself
- Split-transfer with tax going to a separate recipient
- Negative case: no `Transfer` to `expectedRecipient` (under-delivery or wrong tx)

### 11.4 Freshness enforcement

```ts
export function isQuoteFresh(
  ext: EvmQuoteExtension,
  nowMs: number,
  currentBlock: number
): {
  fresh: boolean;
  reason?: 'expired' | 'block-drift';
} {
  if (nowMs > ext.quoteExpiresAtMs) return { fresh: false, reason: 'expired' };
  if (currentBlock - ext.quoteBlockNumber > ext.maxBlockDriftBetweenQuoteAndExecute) {
    return { fresh: false, reason: 'block-drift' };
  }
  return { fresh: true };
}
```

Execution path calls this before building any live tx.

---

## 12. Worker KMS Signer + Signer Registry (Phase 3 — APPROVED CORE CHANGE)

Phase 0 confirms `apps/worker` has no signer registry today. This is an approved, scoped core change
— the ONLY core refactor this plugin ships.

### 12.1 Core change: signer registry

New files in `apps/worker`:

- `apps/worker/src/signers/registry.ts` — minimal registry interface and type
- `apps/worker/src/signers/keeta-native.ts` — wraps the existing Keeta signing path (no behavior
  change, just extracted)
- `apps/worker/src/signers/evm-base-kms.ts` — new (this plugin)
- `apps/worker/src/signers/evm-base-raw.ts` — new dev fallback (this plugin)
- `apps/worker/src/signers/index.ts` — composes the registry

The Keeta native signer's externally observable behavior must be byte-identical before and after
extraction. A regression test locks the existing test suite behavior.

### 12.2 KMS signer (flow unchanged from v3)

Same as v3 Section 12.2: compute EIP-1559 digest, call `KMS.Sign` with `ECDSA_SHA_256` on
`MessageType: 'DIGEST'`, decode DER `(r, s)`, recover `v`, normalize `s` to lower half, assemble,
submit.

EIP-712 permits sign the typed-data digest via the same flow.

### 12.3 IAM policy

Unchanged from v3. Documented in `docs/deployment/aws-kms-signer.md`.

### 12.4 Dev fallback

Unchanged from v3. Refuses to initialize in `NODE_ENV=production`.

### 12.5 `SECURITY.md` addendum

Unchanged from v3.

---

## 13. Base EVM Policy Pack

From v3, plus:

| Rule                                  | Purpose                                                | Default |
| ------------------------------------- | ------------------------------------------------------ | ------- |
| `requirePermitOverApprove`            | Prefer EIP-2612                                        | `true`  |
| `requireZeroFirstApprove`             | Enforce zero-before-nonzero if raw approve used        | `true`  |
| `maxAllowedTransferTaxBps`            | Block high-tax states (bps, derived from percent)      | `100`   |
| `blockOnUnknownTax`                   | Fail-closed on tax read failure                        | `true`  |
| `reverifyTaxOnExecute`                | Re-read tax at execute block                           | `true`  |
| `maxQuoteAgeSeconds`                  | Reject stale quotes                                    | `30`    |
| `maxBlockDriftBetweenQuoteAndExecute` | Reject stale quotes (block-based)                      | `5`     |
| `requireFeeOnTransferSafeSwaps`       | Aerodrome swaps with KTA leg must use FoT-safe variant | `true`  |
| `enforceDeliveredAmount`              | Compare Transfer-log delivered vs minReceived          | `true`  |

All other rules from v3 Section 13 unchanged.

Note on default `maxAllowedTransferTaxBps: 100` (= 1%): operators should calibrate to observed KTA
tax. If typical tax is higher, set higher, but keep the ceiling conservative.

---

## 14. MCP Tools

Unchanged from v3.1 Section 14. Read + intent-creation only. Acceptance criterion wording corrected
in Section 22.

---

## 15. Dashboard Extensions

All from v3.1 Section 15, with these updates:

- `<TaxStatusBadge>` props changed from `bps` to `percent` for clarity (percent is what operators
  read). Thresholds: green `< 1%`, amber `< 5%`, red `>= 5%`. Internal storage still bps, component
  converts.
- Transaction detail view now shows `quoteBlockNumber`, `taxCheckedBlockNumber`,
  `executionBlockNumber` side-by-side so operators can see the freshness story.
- New mini-widget: `<DeliveredFromLogBadge>` that annotates delivered amount with "source: Transfer
  log (verified)".
- Dashboard API's `GET /receipts/:intentId` joins core `NormalizedReceipt` with plugin-local
  `plugin_base_evm_receipts` table and returns a unified view.

---

## 16. External Data Sources

Unchanged from v3.

---

## 17. Config & Env Vars

From v3.1, plus:

```
# Freshness
MAX_QUOTE_AGE_SECONDS=30
MAX_BLOCK_DRIFT_QUOTE_TO_EXECUTE=5
REVERIFY_TAX_ON_EXECUTE=true

# Approve behavior
REQUIRE_PERMIT_OVER_APPROVE=true
REQUIRE_ZERO_FIRST_APPROVE=true
```

All Base-related env vars must also be added to `turbo.json` `globalEnv` per Section 6.

---

## 18. Dependencies

**Scope:** new plugin packages only. Do not rewrite existing repo dependency ranges.

```json
{
  "dependencies": {
    "viem": "<exact version>",
    "abitype": "<exact version>",
    "@aws-sdk/client-kms": "<exact version>",
    "zod": "<match repo version>"
  },
  "devDependencies": {
    "@viem/anvil": "<exact version>",
    "vitest": "<match repo version>"
  }
}
```

Dashboard package matches `apps/dashboard` framework + component + chart library versions exactly.

`KeetaNetwork/anchor`: Phase 0 determines npm availability. If not on npm, vendor under
`third-party/keetanetwork-anchor/` with commit SHA and license compatibility in the vendor README.

---

## 19. Testing

From v3.1, plus:

- `packages/adapter-base-evm/test/tax.test.ts`: percent range validation, out-of-range rejection,
  percent→bps conversion, delivered math matches contract's `amount * tax / 100`. Fixture cases:
  tax=0, tax=1, tax=5, tax=100 (edge), tax=101 (invalid).
- `packages/adapter-base-evm/test/logs.test.ts`: single-transfer, split-transfer with two
  recipients, missing-recipient, wrong-token-in-logs.
- `packages/adapter-base-evm/test/approve.test.ts`: zero-first path correctness when allowance is
  zero, non-zero, and when permit is available.
- `packages/adapter-aerodrome/test/fot.test.ts`: fee-on-transfer-safe function selection for KTA
  legs, standard function for non-KTA routes.
- `apps/worker/test/signers/registry.test.ts`: locks Keeta native signer byte-identical behavior
  before/after extraction.

---

## 20. Docs

From v3.1, plus:

- `docs/plugins/base-evm-anchor/tax-model.md` — percent-based math, where it comes from, how
  operators interpret it
- `docs/plugins/base-evm-anchor/freshness-model.md` — quote TTL and block-drift rules

---

## 21. Execution Order

| Phase | Name                                                                                              | Signing? | Core change?                                | Dashboard? |
| ----- | ------------------------------------------------------------------------------------------------- | -------- | ------------------------------------------- | ---------- |
| 0     | Inventory                                                                                         | N/A      | N/A                                         | N/A        |
| 1     | Read-only foundation + workspace wiring (`plugins/*`, turbo globalEnv)                            | None     | Yes (workspace only)                        | None       |
| 2     | Schemas (EVM quote ext + freshness + plugin-local receipt)                                        | None     | No                                          | None       |
| 3     | **Signer registry core refactor** + KMS signer + raw-key dev + live Base transfers                | KMS      | **Yes (apps/worker/src/signers/)**          | None       |
| 4     | Aerodrome quote-only with FoT-safe function selection                                             | None     | No                                          | None       |
| 5     | Policy pack + Aerodrome live (FoT-safe, zero-first approve, freshness enforcement)                | KMS      | No                                          | None       |
| 5.5   | Anchor reads + drift                                                                              | None     | No                                          | None       |
| 5.6   | Anchor lock/release                                                                               | KMS      | No                                          | None       |
| 5.7   | Dashboard package (views, components, API routes) — may overlap 5.5/5.6 if extension point exists | None     | Maybe (dashboard extension point if absent) | Full       |
| 6     | MCP tools (read + intent-creation only)                                                           | None     | No                                          | None       |
| 7     | Prod docs, IAM runbook, mainnet configs, Playwright + Storybook CI                                | KMS      | No                                          | Full       |

---

## 22. Acceptance Criteria

From v3.1, updated and expanded:

1. `pnpm build`, `pnpm typecheck`, `pnpm lint`, `pnpm test` pass workspace-wide.
2. `pnpm-workspace.yaml` includes `plugins/*`. All Base env vars listed in `turbo.json` `globalEnv`.
3. Plugin uninstalled → core CI byte-identical. `apps/dashboard` visually identical (visual
   regression test).
4. `registerBaseEvmAnchorPlugin` is the only public entry point.
5. No private keys outside `apps/worker`. Workspace import-lint enforces.
6. Worker refuses to boot in `NODE_ENV=production` with `BASE_SIGNING_PRIVATE_KEY` set.
7. Keeta native signer behavior is byte-identical before and after the signer-registry extraction
   (regression test locks).
8. `examples/base-evm-readonly` runs with only `BASE_RPC_URL` set.
9. Every hardcoded address has source URL + verification date comment.
10. Every Base-EVM code path uses `KTA_BASE` etc., never bare `'KTA'` string. Lint enforced.
11. **Tax is read as percent (0–100) in every adapter code path.** Test: fake contract returning
    `101` → adapter rejects with `InvalidTransferTaxError`. Test: contract returns `5` → `taxBps`
    computed as `500`, not `5`.
12. `BLOCK_ON_UNKNOWN_TAX=true` + tax read fails → adapter refuses to quote.
13. `amountDeliveredRaw` is read from the `Transfer` log whose `to == intendedRecipient`, not the
    first log. Test covers the split-transfer case with multiple `Transfer` events.
14. `requireZeroFirstApprove=true` + current allowance non-zero → adapter emits an approve(0) tx
    before approve(N). Test covers.
15. For any Aerodrome swap with `KTA_BASE` as input or intermediate, the adapter selects the
    fee-on-transfer-safe router function (exact name pinned from Phase 0). Test covers selection +
    post-execution balance delta reconciliation.
16. Quote freshness: executing a quote older than `maxQuoteAgeSeconds` or with block drift >
    `maxBlockDriftBetweenQuoteAndExecute` is rejected. Test covers.
17. Tax re-verification: executing a live tx when tax has changed since quote triggers
    `TaxChangedSinceQuote` unless explicitly accepted.
18. **This plugin contributes zero MCP tools classified as `signing`.** Existing core signing MCP
    tools are untouched.
19. EVM receipts map to core `NormalizedReceipt` using `railKind: 'other'` + `network: 'base'`.
    Plugin-local table `plugin_base_evm_receipts` holds extended fields. A tracked issue exists to
    promote fields to core first-class.
20. Dashboard: a Base testnet transfer shows up < 10s after confirmation with correct tax %,
    delivered amount, BaseScan link, gas in ETH + USD.
21. Dashboard: crafted drift event surfaces banner in < 2s via SSE.
22. Dashboard: receipt detail shows `quoteBlockNumber`, `taxCheckedBlockNumber`,
    `executionBlockNumber`, `transferTaxPercent`, `amountDeliveredRaw` (from log), `underDelivered`
    flag, and a working BaseScan link.
23. Dashboard: axe-core reports zero serious/critical violations on every new view.
24. Dashboard: `DASHBOARD_BASE_EVM_ENABLED=false` → zero plugin UI, zero network calls to plugin
    routes from the browser.
25. `docs/deployment/aws-kms-signer.md` includes a working IAM policy and a tested walkthrough.
26. `AWS_KMS_E2E=true` integration test passes against a real test KMS key.
27. Production boot check: plugin refuses to initialize in `NODE_ENV=production` with a public Base
    RPC URL (`mainnet.base.org`) — test covers.

---

## 23. Anti-Hallucination Checklist (Every Commit)

From v3.1, plus:

- Did I divide by 10_000 when computing tax? That's bps math — tax is percent, divide by 100.
- Did I invent a `NormalizedReceipt.raw` field? It doesn't exist — use plugin-local storage.
- Did I add a new `VenueKind` value? Use `transfer | dex | anchor` only.
- Did I use the first `Transfer` log instead of matching by recipient? Match by recipient.
- Did I call `approve(N)` when current allowance is non-zero? Zero first, or permit.
- Did I pick the standard `swapExactTokensForTokens` for a KTA leg? Use the fee-on-transfer-safe
  variant.
- Did I skip re-reading tax at execute time? Re-read.
- Did I modify existing repo dependency ranges? Don't.
- Did I forget to add `plugins/*` to `pnpm-workspace.yaml` or Base env vars to `turbo.json`? Add
  them.
- Did I write "MCP has zero signing tools" as an acceptance criterion? The correct wording is "this
  plugin contributes zero signing-classified MCP tools."

---

## 24. Out-of-Scope

From v3.1, plus:

- Promoting EVM receipt fields to core `NormalizedReceipt` first-class schema. Tracked as separate
  issue.
- Rewriting existing repo dependency ranges to exact pins. Separate hardening pass.
- Extracting the Keeta native signer into its own npm package. The extraction in Phase 3 is
  internal; packaging is future work.
