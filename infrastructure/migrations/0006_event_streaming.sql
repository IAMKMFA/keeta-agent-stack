CREATE TABLE webhook_subscriptions (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  target_url text NOT NULL,
  event_types jsonb NOT NULL,
  status text NOT NULL,
  secret text,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE INDEX webhook_subscriptions_status_idx ON webhook_subscriptions (status);

CREATE TABLE webhook_deliveries (
  id uuid PRIMARY KEY DEFAULT gen_random_uuid(),
  subscription_id uuid NOT NULL REFERENCES webhook_subscriptions(id),
  audit_event_id uuid NOT NULL REFERENCES execution_audit_events(id),
  status text NOT NULL,
  attempt_count integer NOT NULL DEFAULT 0,
  response_status integer,
  response_body text,
  last_error text,
  delivered_at timestamptz,
  next_attempt_at timestamptz,
  created_at timestamptz NOT NULL DEFAULT now(),
  updated_at timestamptz NOT NULL DEFAULT now()
);

CREATE UNIQUE INDEX webhook_deliveries_subscription_event_idx
  ON webhook_deliveries (subscription_id, audit_event_id);

CREATE INDEX webhook_deliveries_status_idx
  ON webhook_deliveries (status, next_attempt_at);
