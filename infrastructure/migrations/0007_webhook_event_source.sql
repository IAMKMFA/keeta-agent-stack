ALTER TABLE webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_audit_event_id_fkey;

ALTER TABLE webhook_deliveries
  DROP CONSTRAINT IF EXISTS webhook_deliveries_audit_event_id_execution_audit_events_id_fk;

ALTER TABLE webhook_deliveries
  ADD COLUMN IF NOT EXISTS event_source text NOT NULL DEFAULT 'audit';

ALTER TABLE webhook_deliveries
  ALTER COLUMN audit_event_id TYPE uuid USING audit_event_id::uuid;

