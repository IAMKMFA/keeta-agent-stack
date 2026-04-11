'use client';

import { useState, useTransition } from 'react';
import type { FormEvent } from 'react';
import { isApiConfigured, requestJson } from '../lib/api';

type AutopilotResponse = {
  ok: boolean;
  plan: unknown;
};

const compareOptions = ['all', 'swift', 'bankwire', 'stripe', 'visa'] as const;

export function OracleAutopilotForm() {
  const [amount, setAmount] = useState('2500');
  const [currency, setCurrency] = useState('USD');
  const [walletAddress, setWalletAddress] = useState('');
  const [recipientWallet, setRecipientWallet] = useState('');
  const [compareFrom, setCompareFrom] = useState<(typeof compareOptions)[number]>('all');
  const [complianceRegion, setComplianceRegion] = useState('US');
  const [network, setNetwork] = useState<'test' | 'main'>('test');
  const [includeSnippet, setIncludeSnippet] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [result, setResult] = useState<unknown>(null);
  const [isPending, startTransition] = useTransition();

  async function onSubmit(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();
    setError(null);
    if (!isApiConfigured()) {
      setError('Set NEXT_PUBLIC_API_URL to enable Oracle autopilot from the dashboard.');
      return;
    }
    const numericAmount = Number(amount);
    if (!Number.isFinite(numericAmount) || numericAmount <= 0) {
      setError('Amount must be greater than 0.');
      return;
    }
    const payload: Record<string, unknown> = {
      amount: numericAmount,
      currency: currency.trim() || 'USD',
      compareFrom,
      includeSdkSnippet: includeSnippet,
      network,
    };
    if (walletAddress.trim()) payload.walletAddress = walletAddress.trim();
    if (recipientWallet.trim()) payload.recipientWallet = recipientWallet.trim();
    if (complianceRegion.trim()) payload.complianceRegion = complianceRegion.trim();

    try {
      const response = await requestJson<AutopilotResponse>('/oracle/autopilot/payment-plan', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify(payload),
      });
      startTransition(() => {
        setResult(response.plan);
      });
    } catch (submitError) {
      const message = submitError instanceof Error ? submitError.message : 'Unable to build payment plan';
      setError(message);
    }
  }

  return (
    <div className="space-y-4">
      <div>
        <div className="hub-kicker">Oracle Autopilot</div>
        <h3 className="hub-heading mt-1 text-xl font-semibold">Generate payment execution playbook</h3>
        <p className="mt-1 text-sm text-[var(--hub-muted)]">
          Build structured rail comparison, exchange instructions, compliance guidance, and optional SDK snippet.
        </p>
      </div>

      <form className="grid gap-3 md:grid-cols-2" onSubmit={onSubmit}>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Amount</span>
          <input
            value={amount}
            onChange={(event) => setAmount(event.target.value)}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder="2500"
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Currency</span>
          <input
            value={currency}
            onChange={(event) => setCurrency(event.target.value.toUpperCase())}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder="USD"
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-[var(--hub-muted)]">Wallet address (optional)</span>
          <input
            value={walletAddress}
            onChange={(event) => setWalletAddress(event.target.value)}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder="kta1..."
          />
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-[var(--hub-muted)]">Recipient wallet (optional)</span>
          <input
            value={recipientWallet}
            onChange={(event) => setRecipientWallet(event.target.value)}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder="kta1recipient..."
          />
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Compare from</span>
          <select
            value={compareFrom}
            onChange={(event) => setCompareFrom(event.target.value as (typeof compareOptions)[number])}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
          >
            {compareOptions.map((value) => (
              <option key={value} value={value}>
                {value}
              </option>
            ))}
          </select>
        </label>
        <label className="space-y-1 text-sm">
          <span className="text-[var(--hub-muted)]">Network</span>
          <select
            value={network}
            onChange={(event) => setNetwork(event.target.value as 'test' | 'main')}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
          >
            <option value="test">test</option>
            <option value="main">main</option>
          </select>
        </label>
        <label className="space-y-1 text-sm md:col-span-2">
          <span className="text-[var(--hub-muted)]">Compliance region (optional)</span>
          <input
            value={complianceRegion}
            onChange={(event) => setComplianceRegion(event.target.value.toUpperCase())}
            className="w-full rounded-xl border border-[var(--hub-line)] bg-white px-3 py-2 outline-none ring-[var(--hub-accent)] transition focus:ring-2"
            placeholder="US"
          />
        </label>
        <label className="inline-flex items-center gap-2 text-sm text-[#4e4c4c] md:col-span-2">
          <input
            type="checkbox"
            checked={includeSnippet}
            onChange={(event) => setIncludeSnippet(event.target.checked)}
            className="h-4 w-4 rounded border-[var(--hub-line)]"
          />
          Include SDK snippet in plan output
        </label>

        <div className="md:col-span-2">
          <button
            type="submit"
            className="rounded-xl bg-[var(--hub-accent-deep)] px-4 py-2 text-sm font-medium text-white transition hover:brightness-110 disabled:cursor-not-allowed disabled:opacity-70"
            disabled={isPending}
          >
            {isPending ? 'Generating...' : 'Generate Oracle playbook'}
          </button>
        </div>
      </form>

      {error ? (
        <div className="rounded-xl border border-[rgba(190,63,67,0.42)] bg-[rgba(190,63,67,0.08)] px-3 py-2 text-sm text-[var(--hub-danger)]">
          {error}
        </div>
      ) : null}

      {result ? (
        <pre className="max-h-[420px] overflow-auto rounded-2xl border border-[var(--hub-line)] bg-[#111313] p-4 text-xs text-[#dde6e6]">
          {JSON.stringify(result, null, 2)}
        </pre>
      ) : null}
    </div>
  );
}
