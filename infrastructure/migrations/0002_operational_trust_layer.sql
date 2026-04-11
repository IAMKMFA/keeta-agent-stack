CREATE TABLE "system_settings" (
	"key" text PRIMARY KEY NOT NULL,
	"value" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "execution_audit_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"execution_id" uuid,
	"intent_id" uuid NOT NULL,
	"event_type" text NOT NULL,
	"payload" jsonb NOT NULL,
	"correlation_id" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "policy_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"policy_config_hash" text,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "intent_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"snapshot_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_snapshots" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"route_plan_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "route_overrides" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"route_plan_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "job_failures" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid,
	"queue_name" text NOT NULL,
	"job_id" text,
	"error_text" text NOT NULL,
	"payload" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "metric_samples" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"name" text NOT NULL,
	"labels" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"value" double precision NOT NULL,
	"captured_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "portfolio_state" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"wallet_id" uuid NOT NULL,
	"payload" jsonb NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "paused" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "execution_intents" ADD COLUMN "requires_approval" boolean DEFAULT false NOT NULL;
--> statement-breakpoint
ALTER TABLE "execution_intents" ADD COLUMN "approval_status" text DEFAULT 'not_required' NOT NULL;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "lifecycle_state" text;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "last_job_error" text;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "last_job_id" text;
--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "normalized_receipt" jsonb;
--> statement-breakpoint
ALTER TABLE "policy_decisions" ADD COLUMN "rule_contributions" jsonb;
--> statement-breakpoint
ALTER TABLE "execution_audit_events" ADD CONSTRAINT "execution_audit_events_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "execution_audit_events" ADD CONSTRAINT "execution_audit_events_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "policy_snapshots" ADD CONSTRAINT "policy_snapshots_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "intent_snapshots" ADD CONSTRAINT "intent_snapshots_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_snapshots" ADD CONSTRAINT "route_snapshots_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "route_overrides" ADD CONSTRAINT "route_overrides_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "job_failures" ADD CONSTRAINT "job_failures_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;--> statement-breakpoint
ALTER TABLE "portfolio_state" ADD CONSTRAINT "portfolio_state_wallet_id_wallets_id_fk" FOREIGN KEY ("wallet_id") REFERENCES "public"."wallets"("id") ON DELETE no action ON UPDATE no action;
