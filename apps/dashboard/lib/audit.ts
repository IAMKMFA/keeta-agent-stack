/**
 * Minimal audit logger for dashboard-side mutation route handlers.
 *
 * Today this writes structured JSON to stdout so deployments that ship
 * Next server logs to a collector (Datadog, Loki, CloudWatch) get them
 * "for free". When the API adds a first-class audit endpoint, swap this
 * implementation to forward events.
 */
import { randomUUID } from 'node:crypto';

export interface AuditEvent {
  actor: string;
  role: string;
  tenantId?: string;
  action: string;
  outcome: string;
  detail?: Record<string, unknown>;
}

export async function audit(event: AuditEvent): Promise<void> {
  const payload = {
    level: 'info',
    source: 'dashboard',
    id: randomUUID(),
    timestamp: new Date().toISOString(),
    ...event,
  };
  console.log(JSON.stringify(payload));
}
