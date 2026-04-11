-- Track when the execution job actually started processing
ALTER TABLE "executions" ADD COLUMN "started_at" timestamp with time zone;

-- Pre-computed settlement latency in ms (from started_at to completion)
ALTER TABLE "executions" ADD COLUMN "settlement_latency_ms" integer;

-- Compound index for efficient aggregation queries: name + time window
CREATE INDEX "metric_samples_name_captured_idx"
  ON "metric_samples" ("name", "captured_at" DESC);

-- GIN index for JSONB label filtering (adapterId / corridorKey lookups)
CREATE INDEX "metric_samples_labels_gin_idx"
  ON "metric_samples" USING gin ("labels");
