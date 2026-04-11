'use client';

import { useEffect, useRef, useState, startTransition } from 'react';
import { usePathname, useRouter } from 'next/navigation';

type StreamEvent = {
  id: string;
  source: 'audit' | 'anchor';
  eventType: string;
  intentId?: string;
  paymentAnchorId?: string;
  executionId?: string;
  createdAt: string;
};

function labelForEvent(event: StreamEvent | null): string {
  if (!event) return 'Waiting for live events';
  if (event.source === 'anchor') {
    return `${event.eventType} · anchor`;
  }
  return `${event.eventType} · pipeline`;
}

export function LiveOpsRail() {
  const pathname = usePathname();
  const router = useRouter();
  const refreshTimerRef = useRef<number | null>(null);
  const [status, setStatus] = useState<'connecting' | 'connected' | 'disconnected'>('connecting');
  const [lastEvent, setLastEvent] = useState<StreamEvent | null>(null);

  useEffect(() => {
    const source = new EventSource('/api/events/stream?limit=100');

    source.onopen = () => setStatus('connected');
    source.onerror = () => setStatus('disconnected');
    source.onmessage = (message) => {
      try {
        const event = JSON.parse(message.data) as StreamEvent;
        setLastEvent(event);
        setStatus('connected');

        const shouldRefresh =
          pathname.startsWith('/anchors') ||
          pathname.startsWith('/intents') ||
          pathname.startsWith('/routes') ||
          pathname.startsWith('/executions') ||
          pathname === '/';

        if (!shouldRefresh) return;
        if (refreshTimerRef.current !== null) return;
        refreshTimerRef.current = window.setTimeout(() => {
          refreshTimerRef.current = null;
          startTransition(() => router.refresh());
        }, 900);
      } catch {
        setStatus('disconnected');
      }
    };

    return () => {
      source.close();
      if (refreshTimerRef.current !== null) {
        window.clearTimeout(refreshTimerRef.current);
      }
    };
  }, [pathname, router]);

  return (
    <div className="rounded-2xl border border-[var(--hub-line)] bg-[rgba(255,255,255,0.82)] px-3 py-2 text-right">
      <div className="flex items-center justify-end gap-2 text-xs text-[var(--hub-muted)]">
        <span
          className={[
            'h-2.5 w-2.5 rounded-full',
            status === 'connected'
              ? 'bg-[var(--hub-accent)] shadow-[0_0_0_4px_rgba(50,149,144,0.12)]'
              : status === 'connecting'
                ? 'bg-[#d7b252]'
                : 'bg-[var(--hub-danger)]',
          ].join(' ')}
        />
        <span>{status === 'connected' ? 'Live stream connected' : status === 'connecting' ? 'Connecting stream' : 'Stream reconnecting'}</span>
      </div>
      <div className="mt-1 text-[11px] text-[var(--hub-muted)]">{labelForEvent(lastEvent)}</div>
    </div>
  );
}
