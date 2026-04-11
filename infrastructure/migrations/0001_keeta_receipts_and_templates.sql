ALTER TABLE "executions" ADD COLUMN "tx_hash" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "block_height" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "settlement_state" text;--> statement-breakpoint
ALTER TABLE "executions" ADD COLUMN "receipt" jsonb;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "slug" text;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "description" text;--> statement-breakpoint
ALTER TABLE "strategies" ADD COLUMN "is_template" boolean DEFAULT false NOT NULL;--> statement-breakpoint
CREATE UNIQUE INDEX "strategies_slug_unique" ON "strategies" ("slug") WHERE "slug" IS NOT NULL;
