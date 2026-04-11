CREATE TABLE "payment_anchors" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"adapter_id" text NOT NULL,
	"label" text NOT NULL,
	"status" text DEFAULT 'draft' NOT NULL,
	"corridor_key" text,
	"operator_ref" text,
	"public_label" boolean DEFAULT true NOT NULL,
	"corridor_config" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"supported_assets" jsonb DEFAULT '[]'::jsonb NOT NULL,
	"commercial_terms" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"metadata" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL,
	CONSTRAINT "payment_anchors_adapter_id_unique" UNIQUE("adapter_id")
);
--> statement-breakpoint
CREATE TABLE "anchor_bonds" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_anchor_id" uuid NOT NULL,
	"amount_atomic" text NOT NULL,
	"asset_id" text DEFAULT 'KTA' NOT NULL,
	"delay_days" integer NOT NULL,
	"status" text DEFAULT 'pending_lock' NOT NULL,
	"lock_tx_hash" text,
	"lock_account" text,
	"withdrawal_requested_at" timestamp with time zone,
	"activated_at" timestamp with time zone,
	"released_at" timestamp with time zone,
	"verified" boolean DEFAULT false NOT NULL,
	"verification_source" text,
	"verification_details" jsonb,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL,
	"updated_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
CREATE TABLE "anchor_events" (
	"id" uuid PRIMARY KEY DEFAULT gen_random_uuid() NOT NULL,
	"payment_anchor_id" uuid NOT NULL,
	"anchor_bond_id" uuid,
	"event_type" text NOT NULL,
	"payload" jsonb DEFAULT '{}'::jsonb NOT NULL,
	"created_at" timestamp with time zone DEFAULT now() NOT NULL
);
--> statement-breakpoint
ALTER TABLE "anchor_bonds" ADD CONSTRAINT "anchor_bonds_payment_anchor_id_payment_anchors_id_fk" FOREIGN KEY ("payment_anchor_id") REFERENCES "public"."payment_anchors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "anchor_events" ADD CONSTRAINT "anchor_events_payment_anchor_id_payment_anchors_id_fk" FOREIGN KEY ("payment_anchor_id") REFERENCES "public"."payment_anchors"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
ALTER TABLE "anchor_events" ADD CONSTRAINT "anchor_events_anchor_bond_id_anchor_bonds_id_fk" FOREIGN KEY ("anchor_bond_id") REFERENCES "public"."anchor_bonds"("id") ON DELETE no action ON UPDATE no action;
--> statement-breakpoint
CREATE INDEX "payment_anchors_status_idx" ON "payment_anchors" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "payment_anchors_corridor_idx" ON "payment_anchors" USING btree ("corridor_key");
--> statement-breakpoint
CREATE INDEX "anchor_bonds_status_idx" ON "anchor_bonds" USING btree ("status");
--> statement-breakpoint
CREATE INDEX "anchor_bonds_payment_anchor_idx" ON "anchor_bonds" USING btree ("payment_anchor_id");
