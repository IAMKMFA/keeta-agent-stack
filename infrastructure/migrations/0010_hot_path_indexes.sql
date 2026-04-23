CREATE INDEX "execution_intents_status_idx" ON "execution_intents" USING btree ("status");--> statement-breakpoint
CREATE INDEX "execution_intents_wallet_created_at_idx" ON "execution_intents" USING btree ("wallet_id","created_at" DESC NULLS LAST);--> statement-breakpoint
CREATE INDEX "policy_decisions_intent_id_idx" ON "policy_decisions" USING btree ("intent_id");--> statement-breakpoint
CREATE INDEX "executions_intent_id_idx" ON "executions" USING btree ("intent_id");