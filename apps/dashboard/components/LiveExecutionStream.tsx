'use client';

import { useEffect, useRef, useState } from 'react';
import { StatusPill } from './ui';

interface StreamEvent {
  id: string;
  topic: string;
  receivedAt: number;
  data: unknown;
}

type ConnectionState = 'idle' | 'connecting' | 'open' | 'closed' | 'error';

function safeParse(raw: string): unknown {
  try {
    return JSON.parse(raw);
  } catch {
    return raw;
  }
}

const MAX_EVENTS = 100;

export function LiveExecutionStream() {
  const [events, setEvents] = useState<StreamEvent[]>([]);
  const [state, setState] = useState<ConnectionState>('idle');
  const [topicFilter, setTopicFilter] = useState<string>('');
  const [paused, setPaused] = useState(false);
  const esRef = useRef<EventSource | null>(null);
  const retriesRef = useRef(0);

  useEffect(() => {
    let cancelled = false;
    function connect() {
      if (cancelled) return;
      setState('connecting');
      // SECURITY: dashboard proxy path only. Browsers MUST NOT open an
      // EventSource against the upstream API directly (e.g.
      // `${NEXT_PUBLIC_API_URL}/events/stream`) — the proxy re-verifies the
      // viewer's role and forwards the server-only OPS_API_KEY. See
      // apps/dashboard/scripts/check-duplicate-routes.ts for the lint that
      // enforces this rule at build time.
      const es = new EventSource('/api/events/stream');
      esRef.current = es;

      es.onopen = () => {
        if (cancelled) return;
        retriesRef.current = 0;
        setState('open');
      };
      es.onerror = () => {
        if (cancelled) return;
        setState('error');
        es.close();
        esRef.current = null;
        const backoffMs = Math.min(30_000, 1_000 * Math.pow(2, retriesRef.current++));
        setTimeout(connect, backoffMs);
      };
      es.onmessage = (ev) => {
        if (cancelled || paused) return;
        setEvents((prev) => {
          const next: StreamEvent = {
            id: ev.lastEventId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
            topic: 'message',
            receivedAt: Date.now(),
            data: safeParse(ev.data),
          };
          const out = [next, ...prev];
          return out.length > MAX_EVENTS ? out.slice(0, MAX_EVENTS) : out;
        });
      };

      // Typed events — pick up common topics published by the API.
      const topics = [
        'intent.created',
        'intent.status_changed',
        'policy.decision',
        'execution.created',
        'execution.status_changed',
        'anchor.reconciled',
        'webhook.delivered',
        'webhook.failed',
      ];
      for (const topic of topics) {
        es.addEventListener(topic, (ev: MessageEvent) => {
          if (cancelled || paused) return;
          setEvents((prev) => {
            const next: StreamEvent = {
              id: ev.lastEventId || `${Date.now()}-${Math.random().toString(36).slice(2, 8)}`,
              topic,
              receivedAt: Date.now(),
              data: safeParse(ev.data),
            };
            const out = [next, ...prev];
            return out.length > MAX_EVENTS ? out.slice(0, MAX_EVENTS) : out;
          });
        });
      }
    }

    connect();

    return () => {
      cancelled = true;
      setState('closed');
      esRef.current?.close();
      esRef.current = null;
    };
  }, [paused]);

  const filtered = topicFilter
    ? events.filter(
        (e) =>
          e.topic.toLowerCase().includes(topicFilter.toLowerCase()) ||
          JSON.stringify(e.data).toLowerCase().includes(topicFilter.toLowerCase())
      )
    : events;

  const stateTone =
    state === 'open'
      ? 'success'
      : state === 'connecting'
        ? 'info'
        : state === 'error'
          ? 'danger'
          : 'neutral';

  return (
    <div className="space-y-3">
      <div className="flex flex-wrap items-center gap-2">
        <StatusPill tone={stateTone}>SSE · {state}</StatusPill>
        <input
          type="text"
          placeholder="Filter topic or payload…"
          value={topicFilter}
          onChange={(e) => setTopicFilter(e.target.value)}
          className="flex-1 rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-sm outline-none focus:border-[var(--keeta-accent)]"
        />
        <button
          type="button"
          onClick={() => setPaused((p) => !p)}
          className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-xs hover:bg-[rgba(50,149,144,0.06)]"
        >
          {paused ? 'Resume' : 'Pause'}
        </button>
        <button
          type="button"
          onClick={() => setEvents([])}
          className="rounded-xl border border-[var(--keeta-line)] bg-white px-3 py-1.5 text-xs hover:bg-[rgba(190,63,67,0.06)]"
        >
          Clear
        </button>
      </div>

      <div className="max-h-[540px] overflow-y-auto rounded-xl border border-[var(--keeta-line)] bg-[rgba(255,255,255,0.6)]">
        {filtered.length === 0 ? (
          <div className="p-6 text-center text-sm text-[var(--keeta-muted)]">
            Waiting for events…
          </div>
        ) : (
          <ul className="divide-y divide-[var(--keeta-line)]">
            {filtered.map((ev) => (
              <li key={ev.id} className="px-3 py-2 text-xs">
                <div className="flex items-center justify-between gap-2">
                  <StatusPill tone="accent" dot={false}>
                    {ev.topic}
                  </StatusPill>
                  <span className="font-mono text-[10px] text-[var(--keeta-muted)]">
                    {new Date(ev.receivedAt).toLocaleTimeString()}
                  </span>
                </div>
                <pre className="mt-1 overflow-x-auto rounded bg-[rgba(44,42,42,0.04)] p-2 font-mono text-[11px] text-[var(--keeta-ink-subtle)]">
                  {typeof ev.data === 'string' ? ev.data : JSON.stringify(ev.data, null, 2)}
                </pre>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}
