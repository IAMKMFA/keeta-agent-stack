'use client';

import { useState, useTransition } from 'react';
import { Button, Card, StatusPill } from '../ui';
import { CSRF_COOKIE_CLIENT, CSRF_HEADER } from '../../lib/csrf-public';

interface KillSwitchPanelProps {
  engaged: boolean;
  canWrite: boolean;
}

type Mutation = 'engage' | 'disengage';

function readClientCsrfToken(): string | null {
  if (typeof document === 'undefined') return null;
  const match = document.cookie
    .split(';')
    .map((s) => s.trim())
    .find((s) => s.startsWith(`${CSRF_COOKIE_CLIENT}=`));
  if (!match) return null;
  const value = match.slice(CSRF_COOKIE_CLIENT.length + 1);
  try {
    return decodeURIComponent(value);
  } catch {
    return value;
  }
}

export function KillSwitchPanel({ engaged, canWrite }: KillSwitchPanelProps) {
  const action: Mutation = engaged ? 'disengage' : 'engage';
  const expected = action.toUpperCase();
  const [confirmValue, setConfirmValue] = useState('');
  const [showDialog, setShowDialog] = useState(false);
  const [status, setStatus] = useState<
    | { kind: 'idle' }
    | { kind: 'pending' }
    | { kind: 'error'; code: string; message: string }
    | { kind: 'placeholder'; action: Mutation }
  >({ kind: 'idle' });
  const [isPending, startTransition] = useTransition();

  async function submit() {
    const token = readClientCsrfToken();
    if (!token) {
      setStatus({
        kind: 'error',
        code: 'csrf_missing_token',
        message: 'Session token missing. Reload the page and try again.',
      });
      return;
    }
    setStatus({ kind: 'pending' });
    try {
      /* Direct fetch() is required here to attach the CSRF header and
         credentials; the call is no-store by construction. */
      // eslint-disable-next-line no-restricted-syntax
      const res = await fetch(`/api/ops/kill-switch/${action}`, {
        method: 'POST',
        credentials: 'include',
        cache: 'no-store',
        headers: {
          'content-type': 'application/json',
          [CSRF_HEADER]: token,
        },
        body: JSON.stringify({ confirm: expected }),
      });
      const body = (await res.json().catch(() => null)) as
        | { error?: { code?: string; message?: string; action?: Mutation } }
        | null;

      if (res.status === 501 && body?.error?.code === 'kill_switch_backend_pending') {
        setStatus({ kind: 'placeholder', action });
        setShowDialog(false);
        setConfirmValue('');
        return;
      }
      if (!res.ok) {
        setStatus({
          kind: 'error',
          code: body?.error?.code ?? 'unknown_error',
          message: body?.error?.message ?? `Request failed with status ${res.status}`,
        });
        return;
      }
      setStatus({ kind: 'idle' });
      setShowDialog(false);
      setConfirmValue('');
    } catch (err) {
      setStatus({
        kind: 'error',
        code: 'network_error',
        message: err instanceof Error ? err.message : 'Network error',
      });
    }
  }

  function onSubmit(e: React.FormEvent<HTMLFormElement>) {
    e.preventDefault();
    if (confirmValue !== expected) {
      setStatus({
        kind: 'error',
        code: 'confirmation_mismatch',
        message: `Type ${expected} exactly to proceed.`,
      });
      return;
    }
    startTransition(() => {
      void submit();
    });
  }

  return (
    <Card
      kicker="Safety"
      title="Execution kill switch"
      actions={
        <StatusPill tone={engaged ? 'danger' : 'success'}>
          {engaged ? 'Engaged' : 'Disengaged'}
        </StatusPill>
      }
    >
      <div className="space-y-3">
        <p className="text-sm text-[var(--keeta-muted)]">
          Engaging the kill switch halts all new execution submissions. In-flight executions
          are not cancelled; they continue through their normal settlement/retry paths.
        </p>

        {canWrite ? (
          <div className="space-y-3">
            {!showDialog ? (
              <div className="flex flex-wrap items-center gap-2">
                <Button
                  variant={engaged ? 'secondary' : 'danger'}
                  type="button"
                  onClick={() => {
                    setShowDialog(true);
                    setStatus({ kind: 'idle' });
                  }}
                >
                  {engaged ? 'Disengage kill switch' : 'Engage kill switch'}
                </Button>
                <span className="text-xs text-[var(--keeta-muted)]">
                  Requires explicit confirmation.
                </span>
              </div>
            ) : (
              <form onSubmit={onSubmit} className="space-y-2 rounded-xl border border-[var(--keeta-line)] bg-[rgba(255,255,255,0.5)] p-3">
                <label className="block text-xs font-semibold text-[var(--keeta-muted)]" htmlFor="kill-switch-confirm">
                  Type <span className="font-mono">{expected}</span> to {action}
                </label>
                <input
                  id="kill-switch-confirm"
                  name="confirm"
                  type="text"
                  autoComplete="off"
                  value={confirmValue}
                  onChange={(e) => setConfirmValue(e.target.value)}
                  className="w-full rounded-lg border border-[var(--keeta-line)] bg-white px-3 py-2 font-mono text-sm"
                  placeholder={expected}
                />
                <div className="flex flex-wrap items-center gap-2">
                  <Button
                    variant={engaged ? 'secondary' : 'danger'}
                    type="submit"
                    disabled={isPending || confirmValue !== expected}
                  >
                    {isPending ? 'Submitting…' : `Confirm ${action}`}
                  </Button>
                  <Button
                    variant="ghost"
                    type="button"
                    onClick={() => {
                      setShowDialog(false);
                      setConfirmValue('');
                      setStatus({ kind: 'idle' });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </form>
            )}

            {status.kind === 'error' && (
              <div className="rounded-xl border border-[var(--keeta-danger)] bg-[rgba(255,0,0,0.05)] p-3 text-xs text-[var(--keeta-danger)]">
                <span className="font-mono">{status.code}</span> — {status.message}
              </div>
            )}
            {status.kind === 'placeholder' && (
              <div className="rounded-xl border border-[var(--keeta-line)] bg-[rgba(0,0,0,0.03)] p-3 text-xs text-[var(--keeta-muted)]">
                <span className="font-semibold">Backend endpoint pending.</span> The dashboard
                enforced the full CSRF + scope + confirmation contract for{' '}
                <span className="font-mono">kill_switch:{status.action}</span>, but the upstream
                API does not yet expose a mutation route. Audit event was recorded.
              </div>
            )}
          </div>
        ) : (
          <div className="rounded-xl border border-[var(--keeta-line)] bg-[rgba(255,255,255,0.5)] p-3 text-xs text-[var(--keeta-muted)]">
            Read-only — the <span className="font-mono">kill_switch:write</span> capability is
            required to toggle the kill switch.
          </div>
        )}
      </div>
    </Card>
  );
}
