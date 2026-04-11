CREATE TABLE "execution_journal_entries" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"intent_id" uuid NOT NULL,
	"execution_id" uuid,
	"intent_hash" text NOT NULL,
	"policy_version" text NOT NULL,
	"route_id" text NOT NULL,
	"receipt_ref" text NOT NULL,
	"merkle_root" text,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "execution_journal_entries" ADD CONSTRAINT "execution_journal_entries_intent_id_execution_intents_id_fk" FOREIGN KEY ("intent_id") REFERENCES "public"."execution_intents"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "execution_journal_entries" ADD CONSTRAINT "execution_journal_entries_execution_id_executions_id_fk" FOREIGN KEY ("execution_id") REFERENCES "public"."executions"("id") ON DELETE no action ON UPDATE no action;
