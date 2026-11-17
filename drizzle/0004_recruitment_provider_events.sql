CREATE TABLE recruitment_provider_events (
  provider TEXT NOT NULL,
  event_id TEXT NOT NULL,
  received_at TEXT NOT NULL,
  outcome TEXT NOT NULL,
  PRIMARY KEY(provider,event_id)
);
--> statement-breakpoint
