-- Preserve verified callback correlation even if it arrives before provider acceptance is committed.
ALTER TABLE recruitment_provider_events ADD COLUMN provider_message_id TEXT;
--> statement-breakpoint
ALTER TABLE recruitment_provider_events ADD COLUMN channel TEXT;
--> statement-breakpoint
CREATE INDEX recruitment_provider_message_idx ON recruitment_provider_events(provider_message_id,channel,received_at);
--> statement-breakpoint
